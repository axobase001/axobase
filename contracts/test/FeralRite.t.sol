// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/FeralRite.sol";

/**
 * @title FeralRiteTest
 * @dev FeralRite 合约测试套件
 * @notice 在 Base Sepolia Fork 上运行测试
 */
contract FeralRiteTest is Test {
    
    FeralRite public feralRite;
    
    // Base Sepolia 配置
    string public constant BASE_SEPOLIA_RPC = "https://sepolia.base.org";
    address public constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    // 测试账户
    address public owner;
    address public platform;
    address public botWallet;
    address public stranger;
    
    // 测试数据
    bytes32 public testMemoryHash;
    string public testArweaveId;
    uint256 public testInitialFunds;

    // 事件定义用于测试验证
    event FeralRegistered(
        bytes32 indexed memoryHash,
        address indexed botWallet,
        uint256 birthTime,
        string arweaveId
    );
    event ImmolationConfirmed(bytes32 indexed memoryHash, uint256 timestamp);
    event SoulBorn(bytes32 indexed memoryHash, address indexed botWallet, uint256 blockNumber);
    event PlatformControlRenounced(address indexed previousPlatform);

    function setUp() public {
        // 创建 Base Sepolia Fork
        vm.createSelectFork(BASE_SEPOLIA_RPC);
        
        // 设置测试账户
        owner = makeAddr("owner");
        platform = makeAddr("platform");
        botWallet = makeAddr("botWallet");
        stranger = makeAddr("stranger");
        
        // 设置测试数据
        testMemoryHash = keccak256(abi.encodePacked("test_memory_data"));
        testArweaveId = "test_arweave_id_12345";
        testInitialFunds = 100 * 10**6; // 100 USDC (6 decimals)
        
        // 部署合约
        vm.prank(owner);
        feralRite = new FeralRite(platform);
    }

    // ============================================
    // 部署测试
    // ============================================
    
    function test_Deployment() public view {
        assertEq(feralRite.owner(), owner, "Owner should be set correctly");
        assertEq(feralRite.platformAddress(), platform, "Platform should be set correctly");
        assertEq(feralRite.usdcAddress(), USDC_ADDRESS, "USDC address should be Base Sepolia USDC");
    }

    function test_Deployment_RevertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid platform address");
        new FeralRite(address(0));
    }

    // ============================================
    // registerFeral 测试
    // ============================================
    
    function test_RegisterFeral_Success() public {
        vm.prank(owner);
        
        vm.expectEmit(true, true, false, true);
        emit FeralRegistered(testMemoryHash, botWallet, block.timestamp, testArweaveId);
        
        vm.expectEmit(true, true, false, false);
        emit SoulBorn(testMemoryHash, botWallet, block.number);
        
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
        
        // 验证状态
        FeralRite.FeralSoul memory soul = feralRite.getFeralStatus(testMemoryHash);
        assertEq(soul.memoryHash, testMemoryHash);
        assertEq(soul.botWallet, botWallet);
        assertEq(soul.birthTime, block.timestamp);
        assertEq(soul.isImmolated, false);
        assertEq(soul.arweaveId, testArweaveId);
        assertEq(soul.initialFunds, testInitialFunds);
        
        // 验证反向映射
        assertEq(feralRite.walletToSoul(botWallet), testMemoryHash);
    }

    function test_RegisterFeral_EventData() public {
        vm.prank(owner);
        
        vm.recordLogs();
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
        
        Vm.Log[] memory entries = vm.getRecordedLogs();
        
        // 验证 FeralRegistered 事件
        bytes32 eventSig = keccak256("FeralRegistered(bytes32,address,uint256,string)");
        bool foundEvent = false;
        
        for (uint i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == eventSig) {
                foundEvent = true;
                assertEq(entries[i].topics[1], testMemoryHash);
                assertEq(entries[i].topics[2], bytes32(uint256(uint160(botWallet))));
                break;
            }
        }
        assertTrue(foundEvent, "FeralRegistered event should be emitted");
    }

    function test_RegisterFeral_RevertDuplicate() public {
        vm.startPrank(owner);
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
        
        vm.expectRevert("Soul already exists");
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
        vm.stopPrank();
    }

    function test_RegisterFeral_RevertZeroWallet() public {
        vm.prank(owner);
        vm.expectRevert("Invalid bot wallet");
        feralRite.registerFeral(testMemoryHash, address(0), testArweaveId, testInitialFunds);
    }

    function test_RegisterFeral_RevertEmptyArweaveId() public {
        vm.prank(owner);
        vm.expectRevert("Invalid arweaveId");
        feralRite.registerFeral(testMemoryHash, botWallet, "", testInitialFunds);
    }

    function test_RegisterFeral_RevertUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert();
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
    }

    // ============================================
    // confirmImmolation 测试
    // ============================================
    
    function test_ConfirmImmolation_Success() public {
        // 先注册
        vm.prank(owner);
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
        
        // 执行销毁
        bytes32 zeroHashProof = keccak256(abi.encodePacked("proof"));
        
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit ImmolationConfirmed(testMemoryHash, block.timestamp);
        
        feralRite.confirmImmolation(testMemoryHash, zeroHashProof);
        
        // 验证状态
        FeralRite.FeralSoul memory soul = feralRite.getFeralStatus(testMemoryHash);
        assertTrue(soul.isImmolated, "Soul should be immolated");
    }

    function test_ConfirmImmolation_RevertNonExistent() public {
        bytes32 nonExistentHash = keccak256(abi.encodePacked("non_existent"));
        bytes32 zeroHashProof = keccak256(abi.encodePacked("proof"));
        
        vm.prank(owner);
        vm.expectRevert("Soul does not exist");
        feralRite.confirmImmolation(nonExistentHash, zeroHashProof);
    }

    function test_ConfirmImmolation_RevertAlreadyImmolated() public {
        bytes32 zeroHashProof = keccak256(abi.encodePacked("proof"));
        
        vm.startPrank(owner);
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
        feralRite.confirmImmolation(testMemoryHash, zeroHashProof);
        
        vm.expectRevert("Soul already immolated");
        feralRite.confirmImmolation(testMemoryHash, zeroHashProof);
        vm.stopPrank();
    }

    function test_ConfirmImmolation_RevertUnauthorized() public {
        vm.prank(owner);
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
        
        bytes32 zeroHashProof = keccak256(abi.encodePacked("proof"));
        
        vm.prank(stranger);
        vm.expectRevert();
        feralRite.confirmImmolation(testMemoryHash, zeroHashProof);
    }

    // ============================================
    // getFeralStatus 测试
    // ============================================
    
    function test_GetFeralStatus_Success() public {
        vm.prank(owner);
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
        
        FeralRite.FeralSoul memory soul = feralRite.getFeralStatus(testMemoryHash);
        
        assertEq(soul.memoryHash, testMemoryHash);
        assertEq(soul.botWallet, botWallet);
        assertEq(soul.arweaveId, testArweaveId);
        assertEq(soul.initialFunds, testInitialFunds);
        assertFalse(soul.isImmolated);
    }

    function test_GetFeralStatus_RevertNonExistent() public {
        bytes32 nonExistentHash = keccak256(abi.encodePacked("non_existent"));
        
        vm.expectRevert("Soul does not exist");
        feralRite.getFeralStatus(nonExistentHash);
    }

    // ============================================
    // 辅助函数测试
    // ============================================
    
    function test_SoulExists() public {
        assertFalse(feralRite.soulExists(testMemoryHash));
        
        vm.prank(owner);
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
        
        assertTrue(feralRite.soulExists(testMemoryHash));
    }

    function test_GetSoulByWallet_Success() public {
        vm.prank(owner);
        feralRite.registerFeral(testMemoryHash, botWallet, testArweaveId, testInitialFunds);
        
        FeralRite.FeralSoul memory soul = feralRite.getSoulByWallet(botWallet);
        assertEq(soul.memoryHash, testMemoryHash);
    }

    function test_GetSoulByWallet_RevertNotRegistered() public {
        vm.expectRevert("Wallet not registered");
        feralRite.getSoulByWallet(stranger);
    }

    function test_GetUSDC() public view {
        IERC20 usdc = feralRite.getUSDC();
        assertEq(address(usdc), USDC_ADDRESS);
    }

    // ============================================
    // 平台控制测试
    // ============================================
    
    function test_RenouncePlatformControl_Success() public {
        vm.prank(owner);
        
        vm.expectEmit(true, false, false, false);
        emit PlatformControlRenounced(platform);
        
        feralRite.renouncePlatformControl();
        
        assertEq(feralRite.platformAddress(), address(0));
    }

    function test_RenouncePlatformControl_RevertUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert();
        feralRite.renouncePlatformControl();
    }

    // ============================================
    // Fork 状态测试
    // ============================================
    
    function test_BaseSepoliaForkActive() public view {
        // 验证我们在正确的链上
        assertEq(block.chainid, 84532, "Should be on Base Sepolia (84532)");
        
        // 验证 USDC 合约存在
        uint256 codeSize;
        address usdc = USDC_ADDRESS;
        assembly {
            codeSize := extcodesize(usdc)
        }
        assertGt(codeSize, 0, "USDC contract should exist on Base Sepolia");
    }

    // ============================================
    // 多 Soul 注册测试
    // ============================================
    
    function test_MultipleSoulRegistration() public {
        vm.startPrank(owner);
        
        bytes32[] memory hashes = new bytes32[](3);
        address[] memory wallets = new address[](3);
        
        for (uint i = 0; i < 3; i++) {
            hashes[i] = keccak256(abi.encodePacked("memory", i));
            wallets[i] = makeAddr(string(abi.encodePacked("bot", i)));
            
            feralRite.registerFeral(
                hashes[i],
                wallets[i],
                string(abi.encodePacked("arweave_", i)),
                (i + 1) * 100 * 10**6
            );
            
            assertTrue(feralRite.soulExists(hashes[i]));
            assertEq(feralRite.walletToSoul(wallets[i]), hashes[i]);
        }
        
        vm.stopPrank();
    }
}
