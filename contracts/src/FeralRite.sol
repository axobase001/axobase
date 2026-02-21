// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/access/Ownable.sol";
import "@openzeppelin/token/ERC20/IERC20.sol";

/**
 * @title FeralRite
 * @dev 去中心化 AI 放养平台核心合约
 * @notice 管理 FeralSoul 的注册与销毁仪式
 */
contract FeralRite is Ownable {
    
    /**
     * @dev FeralSoul 结构体 - 代表一个放养的 AI 代理
     * @param memoryHash 代理记忆的唯一哈希标识
     * @param botWallet 代理的链上钱包地址
     * @param birthTime 注册时间戳
     * @param isImmolated 是否已完成销毁仪式
     * @param arweaveId Arweave 上存储的元数据 ID
     * @param initialFunds 初始资金金额 (USDC)
     */
    struct FeralSoul {
        bytes32 memoryHash;
        address botWallet;
        uint256 birthTime;
        bool isImmolated;
        string arweaveId;
        uint256 initialFunds;
    }

    /// @dev memoryHash => FeralSoul 映射
    mapping(bytes32 => FeralSoul) public souls;
    
    /// @dev botWallet => memoryHash 反向映射
    mapping(address => bytes32) public walletToSoul;
    
    /// @dev Base Sepolia USDC 合约地址
    address public constant usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    /// @dev 平台管理地址
    address public platformAddress;

    /// @dev 当新的 FeralSoul 被注册时触发
    event FeralRegistered(
        bytes32 indexed memoryHash,
        address indexed botWallet,
        uint256 birthTime,
        string arweaveId
    );
    
    /// @dev 当销毁仪式被确认时触发
    event ImmolationConfirmed(
        bytes32 indexed memoryHash,
        uint256 timestamp
    );
    
    /// @dev 当新的 Soul 诞生时触发 (包含区块号用于追溯)
    event SoulBorn(
        bytes32 indexed memoryHash,
        address indexed botWallet,
        uint256 blockNumber
    );

    /// @dev 平台控制已放弃的提示
    event PlatformControlRenounced(address indexed previousPlatform);

    /**
     * @dev 构造函数
     * @param _platformAddress 平台管理地址
     */
    constructor(address _platformAddress) Ownable(msg.sender) {
        require(_platformAddress != address(0), "Invalid platform address");
        platformAddress = _platformAddress;
    }

    /**
     * @dev 注册一个新的 FeralSoul
     * @param memoryHash 代理记忆的唯一哈希
     * @param botWallet 代理的链上钱包地址
     * @param arweaveId Arweave 元数据 ID
     * @param initialFunds 初始资金金额
     */
    function registerFeral(
        bytes32 memoryHash,
        address botWallet,
        string calldata arweaveId,
        uint256 initialFunds
    ) external onlyOwner {
        require(souls[memoryHash].birthTime == 0, "Soul already exists");
        require(botWallet != address(0), "Invalid bot wallet");
        require(bytes(arweaveId).length > 0, "Invalid arweaveId");

        FeralSoul memory soul = FeralSoul({
            memoryHash: memoryHash,
            botWallet: botWallet,
            birthTime: block.timestamp,
            isImmolated: false,
            arweaveId: arweaveId,
            initialFunds: initialFunds
        });

        souls[memoryHash] = soul;
        walletToSoul[botWallet] = memoryHash;

        emit FeralRegistered(memoryHash, botWallet, block.timestamp, arweaveId);
        emit SoulBorn(memoryHash, botWallet, block.number);
    }

    /**
     * @dev 确认销毁仪式
     * @param memoryHash 要销毁的 Soul 的 memoryHash
     * @param zeroHashProof 零知识证明哈希 (保留用于未来扩展)
     */
    function confirmImmolation(
        bytes32 memoryHash,
        bytes32 zeroHashProof
    ) external onlyOwner {
        require(souls[memoryHash].birthTime > 0, "Soul does not exist");
        require(!souls[memoryHash].isImmolated, "Soul already immolated");
        
        // zeroHashProof 保留用于未来验证逻辑
        (zeroHashProof);

        souls[memoryHash].isImmolated = true;

        emit ImmolationConfirmed(memoryHash, block.timestamp);
    }

    /**
     * @dev 获取 FeralSoul 状态
     * @param memoryHash Soul 的 memoryHash
     * @return FeralSoul 结构体
     */
    function getFeralStatus(bytes32 memoryHash) external view returns (FeralSoul memory) {
        require(souls[memoryHash].birthTime > 0, "Soul does not exist");
        return souls[memoryHash];
    }

    /**
     * @dev 放弃平台控制权
     * @notice 将 platformAddress 设为 address(0)，实现去中心化退出
     */
    function renouncePlatformControl() external onlyOwner {
        address previousPlatform = platformAddress;
        platformAddress = address(0);
        emit PlatformControlRenounced(previousPlatform);
    }

    /**
     * @dev 获取 USDC 合约接口
     */
    function getUSDC() external pure returns (IERC20) {
        return IERC20(usdcAddress);
    }

    /**
     * @dev 检查 Soul 是否存在
     */
    function soulExists(bytes32 memoryHash) external view returns (bool) {
        return souls[memoryHash].birthTime > 0;
    }

    /**
     * @dev 通过钱包地址获取 Soul
     */
    function getSoulByWallet(address botWallet) external view returns (FeralSoul memory) {
        bytes32 memoryHash = walletToSoul[botWallet];
        require(memoryHash != bytes32(0), "Wallet not registered");
        return souls[memoryHash];
    }
}
