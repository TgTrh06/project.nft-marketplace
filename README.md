# project.nft-marketplace

OPEN 3 TERMINAL

THE 1ST:
```shell
cd ./server
npx hardhat compile

npx hardhat test

npx hardhat node
```
THE 2ND
```shell
cd ./server
npx hardhat run scripts/deploy.ts --network localhost
npm run api
```
THE 3RD
```shell
cd ./client
npm run dev
```