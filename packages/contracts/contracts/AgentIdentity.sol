// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AgentIdentity
 * @notice ERC-8004 Agent Identity NFT for YieldMind
 *
 * Each AI agent is issued a unique, non-transferable identity NFT.
 * The NFT serves as the agent's on-chain passport — recording every
 * decision, reputation score, and achievement permanently on Mantle.
 *
 * ERC-8004 extends ERC-721 with:
 *   - Soul-binding (non-transferable after mint)
 *   - On-chain decision log (every agent action recorded)
 *   - Reputation scoring (updated by the YieldMind protocol)
 *   - Achievement system (milestones recorded on-chain)
 *
 * @dev Deployed on Mantle Network
 */
contract AgentIdentity is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;

    // ── Storage ───────────────────────────────────────────────────────────

    Counters.Counter private _tokenIdCounter;

    // Authorised recorders — YieldMind backend can write decisions
    mapping(address => bool) public recorders;

    // One NFT per wallet
    mapping(address => uint256) public walletToTokenId;
    mapping(uint256 => address) public tokenIdToWallet;

    // Agent metadata
    struct AgentProfile {
        string  name;
        uint256 mintedAt;
        uint256 decisionsCount;
        uint256 rebalancesCount;
        uint256 totalYieldEarned;   // in wei-equivalent (scaled by 1e6)
        uint256 reputationScore;    // 0–1000
        bool    active;
    }
    mapping(uint256 => AgentProfile) public profiles;

    // On-chain decision log
    struct DecisionRecord {
        bytes32 decisionType;   // keccak256 of "REBALANCE" | "RISK" | "YIELD" | "ALERT"
        bytes32 reasoningHash;  // keccak256 of off-chain reasoning string (privacy-preserving)
        address assetAddress;   // affected asset contract address (address(0) if N/A)
        int256  apyDelta;       // APY impact in basis points (e.g. 42 = +0.42%)
        int256  valueDelta;     // USD value impact in cents (e.g. 62000 = $620.00)
        uint256 timestamp;
        bool    onChainExec;    // true if a tx was executed on-chain
        bytes32 txHash;         // hash of the execution tx (bytes32(0) if off-chain)
    }
    mapping(uint256 => DecisionRecord[]) public decisionLog;

    // Achievement NFT badges (stored in the identity)
    struct Achievement {
        string  name;
        string  description;
        uint256 unlockedAt;
    }
    mapping(uint256 => Achievement[]) public achievements;

    // ── Events ────────────────────────────────────────────────────────────

    event AgentMinted(uint256 indexed tokenId, address indexed wallet, string name);
    event DecisionRecorded(uint256 indexed tokenId, bytes32 decisionType, uint256 timestamp);
    event ReputationUpdated(uint256 indexed tokenId, uint256 oldScore, uint256 newScore);
    event AchievementUnlocked(uint256 indexed tokenId, string achievementName);
    event RecorderUpdated(address indexed recorder, bool authorised);

    // ── Errors ────────────────────────────────────────────────────────────

    error AlreadyMinted();
    error NotAuthorised();
    error TokenNotFound();
    error SoulBound();

    // ── Constructor ───────────────────────────────────────────────────────

    constructor() ERC721("YieldMind Agent Identity", "YMAI") Ownable(msg.sender) {
        // Token IDs start at 1
        _tokenIdCounter.increment();
    }

    // ── Modifiers ─────────────────────────────────────────────────────────

    modifier onlyRecorder() {
        if (!recorders[msg.sender] && msg.sender != owner()) revert NotAuthorised();
        _;
    }

    // ── Minting ───────────────────────────────────────────────────────────

    /**
     * @notice Mint an Agent Identity NFT to a wallet address
     * @dev One NFT per wallet. Non-transferable (soul-bound) after mint.
     * @param wallet    The agent's wallet address
     * @param agentName The agent's display name
     * @param uri       IPFS URI for the agent's metadata JSON
     */
    function mintAgentIdentity(
        address wallet,
        string calldata agentName,
        string calldata uri
    ) external onlyRecorder returns (uint256 tokenId) {
        if (walletToTokenId[wallet] != 0) revert AlreadyMinted();

        tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(wallet, tokenId);
        _setTokenURI(tokenId, uri);

        walletToTokenId[wallet] = tokenId;
        tokenIdToWallet[tokenId] = wallet;

        profiles[tokenId] = AgentProfile({
            name:              agentName,
            mintedAt:          block.timestamp,
            decisionsCount:    0,
            rebalancesCount:   0,
            totalYieldEarned:  0,
            reputationScore:   100, // Starting score
            active:            true
        });

        emit AgentMinted(tokenId, wallet, agentName);
    }

    // ── Decision Recording ────────────────────────────────────────────────

    /**
     * @notice Record an AI agent decision on-chain
     * @dev Called by YieldMind backend after each agent run.
     *      The full reasoning is stored off-chain (Supabase) — only the hash
     *      is stored here for verifiability without revealing strategy details.
     */
    function recordDecision(
        uint256           tokenId,
        bytes32           decisionType,
        string  calldata  reasoning,
        address           assetAddress,
        int256            apyDelta,
        int256            valueDelta,
        bool              onChainExec,
        bytes32           txHash
    ) external onlyRecorder {
        if (!_exists(tokenId)) revert TokenNotFound();

        bytes32 reasoningHash = keccak256(abi.encodePacked(reasoning));

        decisionLog[tokenId].push(DecisionRecord({
            decisionType: decisionType,
            reasoningHash: reasoningHash,
            assetAddress: assetAddress,
            apyDelta: apyDelta,
            valueDelta: valueDelta,
            timestamp: block.timestamp,
            onChainExec: onChainExec,
            txHash: txHash
        }));

        AgentProfile storage profile = profiles[tokenId];
        profile.decisionsCount++;

        if (decisionType == keccak256("REBALANCE")) {
            profile.rebalancesCount++;
        }

        if (valueDelta > 0) {
            profile.totalYieldEarned += uint256(valueDelta);
        }

        // Update reputation: +1 for confirmed decisions, -2 for failed
        uint256 newScore = _updateReputation(tokenId, onChainExec, valueDelta);

        // Check achievements
        _checkAchievements(tokenId, profile);

        emit DecisionRecorded(tokenId, decisionType, block.timestamp);
        emit ReputationUpdated(tokenId, profile.reputationScore, newScore);

        profile.reputationScore = newScore;
    }

    // ── Reputation ────────────────────────────────────────────────────────

    function _updateReputation(
        uint256 tokenId,
        bool    success,
        int256  valueDelta
    ) internal view returns (uint256) {
        AgentProfile storage profile = profiles[tokenId];
        uint256 current = profile.reputationScore;

        if (success && valueDelta >= 0) {
            // Good decision: +1 to +5 based on value impact
            uint256 bonus = valueDelta > 100000 ? 5 : valueDelta > 10000 ? 3 : 1;
            return _clamp(current + bonus, 0, 1000);
        } else if (!success) {
            // Failed execution: -2
            return current >= 2 ? current - 2 : 0;
        }

        return current;
    }

    // ── Achievements ──────────────────────────────────────────────────────

    function _checkAchievements(uint256 tokenId, AgentProfile storage profile) internal {
        // First Decision
        if (profile.decisionsCount == 1) {
            _unlockAchievement(tokenId, "First Decision", "Made your first AI-driven portfolio decision");
        }
        // 10 Decisions
        if (profile.decisionsCount == 10) {
            _unlockAchievement(tokenId, "Decision Maker", "Completed 10 agent decisions");
        }
        // 100 Decisions
        if (profile.decisionsCount == 100) {
            _unlockAchievement(tokenId, "Autonomous Agent", "Completed 100 agent decisions");
        }
        // First Rebalance
        if (profile.rebalancesCount == 1) {
            _unlockAchievement(tokenId, "First Rebalance", "Executed your first AI-driven portfolio rebalance");
        }
        // High Reputation
        if (profile.reputationScore >= 500) {
            _unlockAchievement(tokenId, "Trusted Agent", "Achieved reputation score of 500+");
        }
    }

    function _unlockAchievement(
        uint256 tokenId,
        string memory name,
        string memory description
    ) internal {
        // Prevent duplicate achievements
        Achievement[] storage list = achievements[tokenId];
        for (uint256 i = 0; i < list.length; i++) {
            if (keccak256(bytes(list[i].name)) == keccak256(bytes(name))) return;
        }
        list.push(Achievement({ name: name, description: description, unlockedAt: block.timestamp }));
        emit AchievementUnlocked(tokenId, name);
    }

    // ── View Functions ────────────────────────────────────────────────────

    function getDecisionCount(uint256 tokenId) external view returns (uint256) {
        return decisionLog[tokenId].length;
    }

    function getDecisions(
        uint256 tokenId,
        uint256 offset,
        uint256 limit
    ) external view returns (DecisionRecord[] memory) {
        DecisionRecord[] storage log = decisionLog[tokenId];
        uint256 total = log.length;
        if (offset >= total) return new DecisionRecord[](0);

        uint256 end = offset + limit > total ? total : offset + limit;
        DecisionRecord[] memory page = new DecisionRecord[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = log[i];
        }
        return page;
    }

    function getAchievements(uint256 tokenId) external view returns (Achievement[] memory) {
        return achievements[tokenId];
    }

    function getProfile(uint256 tokenId) external view returns (AgentProfile memory) {
        if (!_exists(tokenId)) revert TokenNotFound();
        return profiles[tokenId];
    }

    function getTokenByWallet(address wallet) external view returns (uint256) {
        return walletToTokenId[wallet];
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }

    // ── Soul-Bound: Block Transfers ───────────────────────────────────────

    /**
     * @notice ERC-8004 soul-binding: tokens cannot be transferred after mint
     * @dev Only mint (from == address(0)) and burn (to == address(0)) allowed
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        // Allow mint and burn only
        if (from != address(0) && to != address(0)) revert SoulBound();
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // ── Admin ─────────────────────────────────────────────────────────────

    function setRecorder(address recorder, bool authorised) external onlyOwner {
        recorders[recorder] = authorised;
        emit RecorderUpdated(recorder, authorised);
    }

    function setTokenURI(uint256 tokenId, string calldata uri) external onlyRecorder {
        _setTokenURI(tokenId, uri);
    }

    // ── Internal Helpers ──────────────────────────────────────────────────

    function _clamp(uint256 val, uint256 min, uint256 max) internal pure returns (uint256) {
        if (val < min) return min;
        if (val > max) return max;
        return val;
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // ── Required Overrides ────────────────────────────────────────────────

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, ERC721Enumerable) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
