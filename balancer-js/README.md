# Balancer Javascript SDK

A JavaScript SDK which provides commonly used utilties for interacting with Balancer Protocol V2.

## How to run the examples (Javascript)?

**In order to run the examples provided, you need to follow the next steps:**

1. `git clone https://github.com/`
2. `cd balancer-sdk`
3. `cd balancer-js`
4. Create a .env file in the balancer-js folder refer .env.sample for more details
5. In the .env file you will need to define and initialize the following variables

   We have defined both Alchemy and Infura, because some of the examples use Infura, others use Alchemy. However, feel free to modify accordingly and use your favourite one.
   ALCHEMY_URL=[ALCHEMY HTTPS ENDPOINT]  
   INFURA=[Infura API KEY]  
   TRADER_KEY=[MetaMask PRIVATE KEY]

6. Run `npm install`, to install all the dependencies
7. Open a new terminal
8. cd to balancer-js
9. Install ts-node using: `npm install ts-node`
10. Install tsconfig-paths using: `npm install --save-dev tsconfig-paths`
11. Generate contracts using: `npm run typechain:generate`
12. Run the example on local using : npm run example ./examples/pools/create/create-weighted-pool.ts --network localhost
13. To run the example on sepolia testnet : npm run example ./examples/pools/create/create-weighted-pool.ts --network sepolia

## Licensing

[GNU General Public License Version 3 (GPL v3)](../../LICENSE).
