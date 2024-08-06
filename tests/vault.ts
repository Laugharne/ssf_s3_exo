import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { expect } from "chai";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";


// this airdrops sol to an address
async function airdropSol(publicKey, amount) {
  let airdropTx = await anchor.getProvider().connection.requestAirdrop(publicKey, amount * anchor.web3.LAMPORTS_PER_SOL);
  await confirmTransaction(airdropTx);
}

async function confirmTransaction(tx) {
  const latestBlockHash = await anchor.getProvider().connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: tx,
  });
}

async function createAccounts(nn: number, amount: number) {
  let accounts: any[] = [];
  let i = 0;

  for( i=0; i<nn; i++) {
    let account = anchor.web3.Keypair.generate();
    await airdropSol(account.publicKey, amount);
    console.log(i+" "+account.publicKey.toString());
    // const balance = await anchor.getProvider().connection.getBalance(account.publicKey);
    // console.log("Balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    accounts.push(account);
  }
  return accounts;
}

describe("vault", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Vault as Program<Vault>;
  
  let accounts   : any[];
  let walletAlice: anchor.web3.Signer;
  let walletBob  : anchor.web3.Signer;

  it("Is initialized!", async () => {

    //create TWO accounts with 2 SOL of balance
    accounts    = await createAccounts(2, 2);
    walletAlice = accounts[0];
    walletBob   = accounts[1];
  
    //const tx = await program.methods.initialize().rpc();
    //console.log("Your transaction signature", tx);
  });


  it("deposit(): multiple deposit on one unique vault", async () => {

    const pda = await getVaultPda( program, "SSF_VAULT", walletAlice);

    let tx = await program.methods.deposit(
      new anchor.BN(3)
    ).accounts( {
      vault: pda.pubkey,
      signer: walletAlice.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([walletAlice])
    .rpc();
    console.log("    (deposit +3) https://solana.fm/tx/"+tx);
    console.log("");

    tx = await program.methods.deposit(
      new anchor.BN(2)
    ).accounts( {
      vault        : pda.pubkey,
      signer       : walletAlice.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([walletAlice])
    .rpc();
    console.log("    (deposit +2) https://solana.fm/tx/"+tx);
    console.log("");

  });

  it("withdraw(): withdraw of an unique wallet to its owner", async () => {
    const pda = await getVaultPda( program, "SSF_VAULT", walletAlice);

    let tx = await program.methods.withdraw(
    ).accounts( {
      vault        : pda.pubkey,
      signer       : walletAlice.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([walletAlice])
    .rpc();
    console.log("    (withdraw) https://solana.fm/tx/"+tx);
    console.log("");
  });

});

async function getVaultPda(
  program: anchor.Program<Vault>,
  tag    : String,
  wallet : anchor.web3.Signer

) {

  const [pubKey, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from(tag),
      wallet.publicKey.toBuffer(),
    ],
    program.programId
  );

  let pda = {
    pubkey: pubKey,
    bump  : bump,
  };

  return pda;
}