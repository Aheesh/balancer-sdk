import '@nomiclabs/hardhat-ethers';
import * as dotenv from 'dotenv';
import { url } from 'inspector';
dotenv.config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

export default {
  networks: {
    hardhat: {
      chainId: 11155111,
      url: 'http://127.0.0.1:8000',
    },
    sepolia: {
      chainId: 11155111,
      url: process.env.ALCHEMY_SEPOLIA_URL,
      accounts: [process.env.TRADER_KEY],
    },
  },
};
