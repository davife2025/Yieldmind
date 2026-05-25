// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DecisionLedger
 * @notice Immutable on-chain log of all YieldMind agent decisions
 *
 * Every AI agent decision — rebalances, risk mitigations, yield updates —
 * is recorded here as a permanent, verifiable event on Mantle.
 *
 * This is the backbone of YieldMind's "radical transparency" —
 * the on-chain benchmark referenced in The Turing Test Hackathon.
 *
 * @dev Separate from AgentIdentity to keep gas costs low for frequent writes
 */
contract DecisionLedger is Ownable {

    // ── Constants ─────────────────────────────────────────────────────────

    bytes32 public constant DECISION_REBALANCE = keccak256("REBALANCE");
    bytes32 public constant DECISION_RISK       = keccak256("RISK");
    bytes32 public constant DECISION_YIELD      = keccak256("YIELD");
    bytes32 public constant DECISION_ALERT      = keccak256("ALERT");
    bytes32 public constant DECISION_INFO       = keccak256("INFO");

    // ── Storage ───────────────────────────────────────────────────────────

    mapping(address => bool) public recorders;

    struct Decision {
        uint256 agentTokenId;     // ERC-8004 token ID
        address agentWallet;      // Agent's wallet address
        bytes32 decisionType;     // keccak256 hash of type string
        bytes32 reasoningHash;    // keccak256 hash of full reasoning (stored off-chain)
        bytes32 assetId;          // keccak256 hash of asset symbol
        int256  apyDeltaBps;      // APY delta in basis points (1 bps = 0.01%)
        int256  valueDeltaCents;  // Value delta in USD cents
        uint256 blockNumber;
        uint256 timestamp;
    }

    // Global decision counter
    uint256 public totalDecisions;

    // All decisions (indexed by sequential ID)
    mapping(uint256 => Decision) public decisions;

    // Decisions per agent wallet
    mapping(address => uint256[]) public agentDecisionIds;

    // ── Events ────────────────────────────────────────────────────────────

    event DecisionLogged(
        uint256 indexed decisionId,
        uint256 indexed agentTokenId,
        address indexed agentWallet,
        bytes32 decisionType,
        bytes32 assetId,
        int256  apyDeltaBps,
        int256  valueDeltaCents,
        uint256 timestamp
    );

    event RecorderSet(address indexed recorder, bool authorised);

    // ── Errors ────────────────────────────────────────────────────────────

    error NotAuthorised();

    // ── Constructor ───────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Modifiers ─────────────────────────────────────────────────────────

    modifier onlyRecorder() {
        if (!recorders[msg.sender] && msg.sender != owner()) revert NotAuthorised();
        _;
    }

    // ── Core: Log a decision ──────────────────────────────────────────────

    /**
     * @notice Log an agent decision on-chain
     * @param agentTokenId    ERC-8004 NFT token ID
     * @param agentWallet     Agent's wallet address
     * @param decisionType    keccak256("REBALANCE") etc
     * @param reasoning       Full reasoning string (hashed for storage)
     * @param assetId         keccak256 of asset symbol, e.g. keccak256("USDY")
     * @param apyDeltaBps     APY change in basis points (+42 = +0.42%)
     * @param valueDeltaCents USD value change in cents (+62000 = +$620.00)
     */
    function logDecision(
        uint256        agentTokenId,
        address        agentWallet,
        bytes32        decisionType,
        string calldata reasoning,
        bytes32        assetId,
        int256         apyDeltaBps,
        int256         valueDeltaCents
    ) external onlyRecorder returns (uint256 decisionId) {
        decisionId = ++totalDecisions;

        decisions[decisionId] = Decision({
            agentTokenId:     agentTokenId,
            agentWallet:      agentWallet,
            decisionType:     decisionType,
            reasoningHash:    keccak256(abi.encodePacked(reasoning)),
            assetId:          assetId,
            apyDeltaBps:      apyDeltaBps,
            valueDeltaCents:  valueDeltaCents,
            blockNumber:      block.number,
            timestamp:        block.timestamp
        });

        agentDecisionIds[agentWallet].push(decisionId);

        emit DecisionLogged(
            decisionId,
            agentTokenId,
            agentWallet,
            decisionType,
            assetId,
            apyDeltaBps,
            valueDeltaCents,
            block.timestamp
        );
    }

    // ── Batch logging (gas optimised for multiple decisions) ──────────────

    struct DecisionInput {
        uint256  agentTokenId;
        address  agentWallet;
        bytes32  decisionType;
        string   reasoning;
        bytes32  assetId;
        int256   apyDeltaBps;
        int256   valueDeltaCents;
    }

    function logDecisionBatch(DecisionInput[] calldata inputs)
        external onlyRecorder returns (uint256[] memory ids)
    {
        ids = new uint256[](inputs.length);
        for (uint256 i = 0; i < inputs.length; i++) {
            ids[i] = ++totalDecisions;
            DecisionInput calldata d = inputs[i];

            decisions[ids[i]] = Decision({
                agentTokenId:    d.agentTokenId,
                agentWallet:     d.agentWallet,
                decisionType:    d.decisionType,
                reasoningHash:   keccak256(abi.encodePacked(d.reasoning)),
                assetId:         d.assetId,
                apyDeltaBps:     d.apyDeltaBps,
                valueDeltaCents: d.valueDeltaCents,
                blockNumber:     block.number,
                timestamp:       block.timestamp
            });

            agentDecisionIds[d.agentWallet].push(ids[i]);

            emit DecisionLogged(
                ids[i], d.agentTokenId, d.agentWallet,
                d.decisionType, d.assetId,
                d.apyDeltaBps, d.valueDeltaCents,
                block.timestamp
            );
        }
    }

    // ── View ──────────────────────────────────────────────────────────────

    function getAgentDecisionCount(address wallet) external view returns (uint256) {
        return agentDecisionIds[wallet].length;
    }

    function getAgentDecisions(
        address wallet,
        uint256 offset,
        uint256 limit
    ) external view returns (Decision[] memory) {
        uint256[] storage ids = agentDecisionIds[wallet];
        uint256 total = ids.length;
        if (offset >= total) return new Decision[](0);

        uint256 end = offset + limit > total ? total : offset + limit;
        Decision[] memory page = new Decision[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = decisions[ids[i]];
        }
        return page;
    }

    // ── Admin ─────────────────────────────────────────────────────────────

    function setRecorder(address recorder, bool authorised) external onlyOwner {
        recorders[recorder] = authorised;
        emit RecorderSet(recorder, authorised);
    }
}
