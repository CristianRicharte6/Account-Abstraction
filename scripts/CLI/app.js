const prompt = require("prompt-sync")({
  sigint: true
}); //sigint allows the user to exit using CTRL-C
const {
  ethers
} = require("ethers");
const WalletABI = require("../../artifacts/contracts/SmartWallet.sol/SmartWallet.json")

const deployCBDC = require("./deployCBDC")
const deployWalletFactory = require("./deploySmartWalletFactory")
const deploySmartWallet = require("./deploySmartWallet")
const transfereUSD = require("./singleTransferSmartWallet");
const {
  BundlerPKey,
  SignerPKey,
  Bundler,
  Provider,
} = require("../config");

// 1. Add a private key to add a signer for your smart wallet
// 2. Deploy a Smart Wallet through the Wallet factory (Also, Deploy factory, CBDC and transfer funds to smart wallet)
// 3. Send a transaction onChain (ERC20 transfer)
// 4. Show the transaction receipt with the fee paid in USD. 

async function main() {
  const chain = await Provider.detectNetwork();

  if (!BundlerPKey || !SignerPKey) {
    throw new Error("⚠🏮 Please add a private key to your .env for the Bundler and for the Smart Wallet Owner");
  }

  const BundlerBalance = await Provider.getBalance(Bundler.address);

  if (BundlerBalance == 0) {
    throw new Error("⚠🏮 Bundler needs to have some Native Currency as ETH/ARB/BNB for Deployments and fees sponsorship")
  }
  console.log("\n👨‍🍳 Gas Fellow is setting the environment...")
  const CBDC = await deployCBDC.main(Bundler);
  const WalletFactory = await deployWalletFactory.main(Bundler);
  const SmartWalletAddress = await deploySmartWallet.main(WalletFactory.address, CBDC.address, Bundler)

  const SmartWallet = new ethers.Contract(SmartWalletAddress, WalletABI.abi, Bundler)

  console.log(`\nSMART CONTRACTS DEPLOYED:`)
  console.log(`🪙 eUSD CBDC to: ${CBDC.address}`)
  console.log(`🏭 Smart Wallet Factory to: ${WalletFactory.address}`)
  console.log(`💳 Smart Wallet to: ${SmartWallet.address}`)
  console.log(`\n🌐 Chain Name: ${chain.name}, Chain Id: ${chain.chainId}`)

  const transferRes = await CBDC.connect(Bundler).transfer(SmartWallet.address, 1000 * 10 ** 8, {
    gasPrice: 5000000000
  })
  await transferRes.wait();
  const walletBalance = await CBDC.balanceOf(SmartWallet.address)

  console.log(`\nWe have topped up your Smart Wallet Balance with some eUSD. Now, your Smart Wallet balance is: ${walletBalance / 10**8} eUSD 🤑`)

  let receiver = "";

  while (receiver === "") {
    console.log("\nLet's do a Demo of how to transfer 100 eUSD without the need for having the Native Chain token.")
    receiver = String(prompt("  📩 Add the receiver Public key: "))
  }

  let confirmation = String(prompt("\nYou are about to send 10 eUSD and pay the Gas Fee in eUSD. Are you excited? (Yes / No)"))
  if (confirmation.toUpperCase() === "YES") {
    console.log("\nLet's gooo!👾")
  } else if (confirmation.toUpperCase() === "NO") {
    console.log("\nLet´s do it anyway, you will be impressed once you try!😎")
  } else {
    console.log("\nI didn't understand, but let`s show you how Gas Fellow can do magic!🪄 ")
  }

  const receipt = await transfereUSD.main(SignerPKey, SmartWallet.address, receiver, CBDC.address, Bundler, Provider);

  if (!receipt.transactionHash) {
    console.log("Receipt ", receipt)
    throw new Error("Something went wrong while sending the Transaction");
  }
  console.log('\nCongrats!🎊 You have completed your first transaction without needing the Native Chain token and paying fees in eUSD')
  console.log(`\nCheck the transaction receipt in the chain scanner by adding the Transaction Hash.`)
  console.log(`Transaction Hash: ${receipt.transactionHash}`)

  console.log("\nDeveloped by Cristian Richarte Gil 🥷")
}

main().catch(err => {
  console.log(err)
})