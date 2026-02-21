// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/FeralRite.sol";

/**
 * @title Deploy
 * @dev FeralRite 合约部署脚本
 * @notice 部署到 Base Sepolia 测试网
 * 
 * 使用方法:
 * 1. 设置环境变量: export PRIVATE_KEY=your_private_key
 * 2. 运行: forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
 */
contract Deploy is Script {
    
    /// @dev Base Sepolia Chain ID
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;
    
    /// @dev Base Sepolia USDC 地址
    address public constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        // 读取私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // 读取或设置平台地址 (默认使用部署者)
        address platformAddress = vm.envOr("PLATFORM_ADDRESS", deployer);
        
        console.log("========================================");
        console.log("FeralRite Contract Deployment");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Platform Address:", platformAddress);
        console.log("Expected USDC:", USDC_ADDRESS);
        console.log("Chain ID:", block.chainid);
        console.log("========================================");
        
        // 验证链 ID
        require(
            block.chainid == BASE_SEPOLIA_CHAIN_ID,
            string.concat(
                "Wrong network! Expected Base Sepolia (", 
                vm.toString(BASE_SEPOLIA_CHAIN_ID), 
                "), got (", 
                vm.toString(block.chainid), 
                ")"
            )
        );
        
        // 开始广播交易
        vm.startBroadcast(deployerPrivateKey);
        
        // 部署合约
        FeralRite feralRite = new FeralRite(platformAddress);
        
        vm.stopBroadcast();
        
        // 输出部署信息
        console.log("\n========================================");
        console.log("Deployment Successful!");
        console.log("========================================");
        console.log("Contract Address:", address(feralRite));
        console.log("Owner:", feralRite.owner());
        console.log("Platform:", feralRite.platformAddress());
        console.log("USDC Address:", feralRite.usdcAddress());
        console.log("========================================");
        
        // 保存部署信息到文件
        _saveDeployment(address(feralRite), deployer, platformAddress);
        
        // 验证部署
        _verifyDeployment(feralRite);
    }
    
    /**
     * @dev 保存部署信息到 broadcast 目录
     */
    function _saveDeployment(
        address contractAddress,
        address deployer,
        address platformAddress
    ) internal {
        string memory deploymentInfo = string.concat(
            "{\n",
            '  "contract": "FeralRite",', "\n",
            '  "chainId": ', vm.toString(block.chainid), ",\n",
            '  "chainName": "Base Sepolia",', "\n",
            '  "contractAddress": "', vm.toString(contractAddress), '",', "\n",
            '  "deployer": "', vm.toString(deployer), '",', "\n",
            '  "platformAddress": "', vm.toString(platformAddress), '",', "\n",
            '  "usdcAddress": "', vm.toString(USDC_ADDRESS), '",', "\n",
            '  "timestamp": ', vm.toString(block.timestamp), ",\n",
            '  "blockNumber": ', vm.toString(block.number), "\n",
            "}\n"
        );
        
        // 创建 broadcast 目录
        string memory broadcastDir = "./broadcast";
        vm.createDir(broadcastDir, true);
        
        // 保存到文件
        string memory filename = string.concat(
            broadcastDir, 
            "/deploy-", 
            vm.toString(block.timestamp), 
            ".json"
        );
        
        vm.writeFile(filename, deploymentInfo);
        console.log("\nDeployment info saved to:", filename);
    }
    
    /**
     * @dev 验证部署结果
     */
    function _verifyDeployment(FeralRite feralRite) internal view {
        console.log("\n--- Deployment Verification ---");
        
        // 验证 USDC 地址
        require(
            feralRite.usdcAddress() == USDC_ADDRESS,
            "USDC address mismatch!"
        );
        console.log("[OK] USDC address verified");
        
        // 验证合约代码存在
        uint256 codeSize;
        address contractAddr = address(feralRite);
        assembly {
            codeSize := extcodesize(contractAddr)
        }
        require(codeSize > 0, "No contract code deployed!");
        console.log("[OK] Contract code deployed");
        
        console.log("--- All checks passed! ---");
    }
}
