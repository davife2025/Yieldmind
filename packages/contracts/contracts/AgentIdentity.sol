// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentIdentity
 * @notice ERC-8004 Agent Identity NFT for YieldMind
 *
 * Soul-bound (non-transferable) NFT issued to each AI agent wallet.
 * Records every decision, reputation score, and achievement on Mantle.
 *
 * Compatible with OpenZeppelin v5 (no Counters, uses _update hook).
 */
contract AgentIdentity is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {

    // ── Storage ───────────────────────────────────────────────────────────

    uint256 private _nextTokenId = 1;

    mapping(address => bool) public recorders;
    mapping(address => uint256) public walletToTokenId;
    mapping(uint256 => address) public tokenIdToWallet;

    struct AgentProfile {
        string  name;
        uint256 mintedAt;
        uint256 decisionsCount;
        uint256 rebalancesCount;
        uint256 totalYieldEarned;
        uint256 reputationScore;
        bool    active;
    }
    mapping(uint256 => AgentProfile) public profiles;

    struct DecisionRecord {
        bytes32 decisionType;
        bytes32 reasoningHash;
        address assetAddress;
        int256  apyDelta;
        int256  valueDelta;
        uint256 timestamp;
        bool    onChainExec;
        bytes32 txHash;
    }
    mapping(uint256 => DecisionRecord[]) public decisionLog;

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

    constructor() ERC721("YieldMind Agent Identity", "YMAI") Ownable(msg.sender) {}

    // ── Modifiers ─────────────────────────────────────────────────────────

    modifier onlyRecorder() {
        if (!recorders[msg.sender] && msg.sender != owner()) revert NotAuthorised();
        _;
    }

    // ── Minting ───────────────────────────────────────────────────────────

    function mintAgentIdentity(
        address wallet,
        string calldata agentName,
        string calldata uri
    ) external onlyRecorder returns (uint256 tokenId) {
        if (walletToTokenId[wallet] != 0) revert AlreadyMinted();

        tokenId = _nextTokenId++;

        _safeMint(wallet, tokenId);
        _setTokenURI(tokenId, uri);

        walletToTokenId[wallet] = tokenId;
        tokenIdToWallet[tokenId] = wallet;

        profiles[tokenId] = AgentProfile({
            name:             agentName,
            mintedAt:         block.timestamp,
            decisionsCount:   0,
            rebalancesCount:  0,
            totalYieldEarned: 0,
            reputationScore:  100,
            active:           true
        });

        emit AgentMinted(tokenId, wallet, agentName);
    }

    // ── Decision Recording ────────────────────────────────────────────────

    function recordDecision(
        uint256          tokenId,
        bytes32          decisionType,
        string  calldata reasoning,
        address          assetAddress,
        int256           apyDelta,
        int256           valueDelta,
        bool             onChainExec,
        bytes32          txHash
    ) external onlyRecorder {
        if (_ownerOf(tokenId) == address(0)) revert TokenNotFound();

        decisionLog[tokenId].push(DecisionRecord({
            decisionType:  decisionType,
            reasoningHash: keccak256(abi.encodePacked(reasoning)),
            assetAddress:  assetAddress,
            apyDelta:      apyDelta,
            valueDelta:    valueDelta,
            timestamp:     block.timestamp,
            onChainExec:   onChainExec,
            txHash:        txHash
        }));

        AgentProfile storage profile = profiles[tokenId];
        profile.decisionsCount++;

        if (decisionType == keccak256("REBALANCE")) {
            profile.rebalancesCount++;
        }
        if (valueDelta > 0) {
            profile.totalYieldEarned += uint256(valueDelta);
        }

        uint256 newScore = _calcReputation(profile.reputationScore, onChainExec, valueDelta);
        uint256 oldScore = profile.reputationScore;
        profile.reputationScore = newScore;

        _checkAchievements(tokenId, profile);

        emit DecisionRecorded(tokenId, decisionType, block.timestamp);
        emit ReputationUpdated(tokenId, oldScore, newScore);
    }

    // ── Reputation ────────────────────────────────────────────────────────

    function _calcReputation(
        uint256 current,
        bool    success,
        int256  valueDelta
    ) internal pure returns (uint256) {
        if (success && valueDelta >= 0) {
            uint256 bonus = valueDelta > 100000 ? 5 : valueDelta > 10000 ? 3 : 1;
            uint256 next = current + bonus;
            return next > 1000 ? 1000 : next;
        } else if (!success) {
            return current >= 2 ? current - 2 : 0;
        }
        return current;
    }

    // ── Achievements ──────────────────────────────────────────────────────

    function _checkAchievements(uint256 tokenId, AgentProfile storage profile) internal {
        if (profile.decisionsCount  == 1)   _unlockAchievement(tokenId, "First Decision",    "Made your first AI-driven decision");
        if (profile.decisionsCount  == 10)  _unlockAchievement(tokenId, "Decision Maker",    "Completed 10 agent decisions");
        if (profile.decisionsCount  == 100) _unlockAchievement(tokenId, "Autonomous Agent",  "Completed 100 agent decisions");
        if (profile.rebalancesCount == 1)   _unlockAchievement(tokenId, "First Rebalance",   "Executed your first rebalance");
        if (profile.reputationScore >= 500) _unlockAchievement(tokenId, "Trusted Agent",     "Achieved reputation score 500+");
    }

    function _unlockAchievement(uint256 tokenId, string memory name, string memory desc) internal {
        Achievement[] storage list = achievements[tokenId];
        for (uint256 i = 0; i < list.length; i++) {
            if (keccak256(bytes(list[i].name)) == keccak256(bytes(name))) return;
        }
        list.push(Achievement({ name: name, description: desc, unlockedAt: block.timestamp }));
        emit AchievementUnlocked(tokenId, name);
    }

    // ── Soul-Bound: OZ v5 uses _update hook (replaces _beforeTokenTransfer) ──

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        // Block transfers between wallets — allow only mint (from==0) and burn (to==0)
        if (from != address(0) && to != address(0)) revert SoulBound();
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    // ── View Functions ────────────────────────────────────────────────────

    function getDecisionCount(uint256 tokenId) external view returns (uint256) {
        return decisionLog[tokenId].length;
    }

    function getDecisions(uint256 tokenId, uint256 offset, uint256 limit)
        external view returns (DecisionRecord[] memory)
    {
        DecisionRecord[] storage log = decisionLog[tokenId];
        uint256 total = log.length;
        if (offset >= total) return new DecisionRecord[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        DecisionRecord[] memory page = new DecisionRecord[](end - offset);
        for (uint256 i = offset; i < end; i++) page[i - offset] = log[i];
        return page;
    }

    function getAchievements(uint256 tokenId) external view returns (Achievement[] memory) {
        return achievements[tokenId];
    }

    function getProfile(uint256 tokenId) external view returns (AgentProfile memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenNotFound();
        return profiles[tokenId];
    }

    function getTokenByWallet(address wallet) external view returns (uint256) {
        return walletToTokenId[wallet];
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ── Admin ─────────────────────────────────────────────────────────────

    function setRecorder(address recorder, bool authorised) external onlyOwner {
        recorders[recorder] = authorised;
        emit RecorderUpdated(recorder, authorised);
    }

    function setTokenURI(uint256 tokenId, string calldata uri) external onlyRecorder {
        _setTokenURI(tokenId, uri);
    }

    // ── Required OZ v5 Overrides ──────────────────────────────────────────

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
