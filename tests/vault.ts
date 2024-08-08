import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { PublicKey } from "@solana/web3.js";

import {
  Account,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
} from '@solana/spl-token';

// this airdrops sol to an address
async function airdropSol(publicKey, amount) {
  let airdropTx = await anchor.getProvider().connection.requestAirdrop(publicKey, amount * anchor.web3.LAMPORTS_PER_SOL);
  await confirmTransaction(airdropTx);
}

async function confirmTransaction(tx) {
  const latestBlockHash = await anchor.getProvider().connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction({
    blockhash           : latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature           : tx,
  });
}

async function createAccounts(nn: number, amount: number) {
  let accounts: any[] = [];
  let i = 0;

  for( i=0; i<nn; i++) {
    let account = anchor.web3.Keypair.generate();
    await airdropSol(account.publicKey, amount);
    console.log("    "+i+" "+account.publicKey.toString());
    // const balance = await anchor.getProvider().connection.getBalance(account.publicKey);
    // console.log("    Balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    accounts.push(account);
  }
  return accounts;
}

describe("vault", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let connection: anchor.web3.Connection;
  const program = anchor.workspace.Vault as Program<Vault>;
  connection    = provider.connection;

  let accounts   : any[];
  let walletAlice: anchor.web3.Signer;
  let mintAlice  : anchor.web3.PublicKey;
  let ataAlice   : Account;
  let amountAlice = 6;

  let walletBob  : anchor.web3.Signer;
  let mintBob;
  let ataBob;

  const decimals = 0;

  it("Is initialized!", async () => {

    //create TWO accounts with 2 SOL of balance
    accounts    = await createAccounts(2, 10);
    walletAlice = accounts[0];
    walletBob   = accounts[1];

    // mint account
    try {
      mintAlice = await createMint(
        connection      ,   // connection
        walletAlice           ,   // fee payer
        walletAlice.publicKey,    // mint authority
        null           ,    // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
        decimals       ,    // decimals
      );
    } catch(err) {
      console.log(err);
    }
    console.log("    mint Alice", mintAlice.toBase58());

    try {
      // ATA
      ataAlice = await getOrCreateAssociatedTokenAccount(
        connection,
        walletAlice,
        mintAlice,
        walletAlice.publicKey
      );
    } catch(err) {
      console.log(err);
    }
    console.log("    ATA Alice", ataAlice.address.toBase58());

    try {
      // MINT
      let mintTx = await mintTo(
        connection            ,            // connection
        walletAlice           ,            // payer
        mintAlice             ,            // mint
        ataAlice.address     ,             // destination
        walletAlice.publicKey ,            // authority
        amountAlice                        // amount
      );
      console.log('    Mint Transaction:', mintTx);

      // AUTHORITY
      await setAuthority(
        connection,
        walletAlice           ,   // Payer of the transaction fees
        mintAlice             ,   // Account
        walletAlice.publicKey,    // Current authority
        0                     ,   // Authority type: "0" represents Mint Tokens
        null                 ,    // Setting the new Authority to null
      );
      console.log('    Authority is set for Alice !');

      const tokenAccountInfo = await getAccount(
        connection,
        ataAlice.address
      );

      const balanceToken = tokenAccountInfo.amount / BigInt(Math.pow(10, decimals));
      console.log("    "+balanceToken);

    } catch(err) {
      console.log(err);
    }

    let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("SSF_ACCOUNT_VAULT")],
      program.programId
    );
    console.log("    TokenAccountOwnerPda: " + tokenAccountOwnerPda);

    let confirmOptions = {
      skipPreflight: true,
    };

    try {
      let initVaultTx = await program.methods
        .initialize()
        .accounts({
          tokenAccountOwnerPda: tokenAccountOwnerPda,
          signer              : program.provider.publicKey,
        })
        .rpc(confirmOptions);

      await logTransaction(connection, initVaultTx);

    } catch(err) {
      console.log(err);
    }

  });


  it("deposit(): multiple deposit on one unique vault", async () => {

    const pda = await getVaultPda( program, "SSF_PDA_VAULT", mintAlice);

    let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("SSF_ACCOUNT_VAULT")],
      program.programId
    );

    let tx = await program.methods.deposit(
      new anchor.BN(3)
    ).accounts( {
      tokenAccountOwnerPda: tokenAccountOwnerPda,
      vault               : pda.pubkey,
      signer              : walletAlice.publicKey,
      mintAccount         : mintAlice,
      senderTokenAccount  : ataAlice.address,
      systemProgram       : anchor.web3.SystemProgram.programId,
    })
    .signers([walletAlice])
    .rpc();
    console.log("    (deposit +3) https://solana.fm/tx/"+tx);
    console.log("");

    tx = await program.methods.deposit(
      new anchor.BN(2)
    ).accounts( {
      tokenAccountOwnerPda: tokenAccountOwnerPda,
      vault               : pda.pubkey,
      signer              : walletAlice.publicKey,
      mintAccount         : mintAlice,
      senderTokenAccount  : ataAlice.address,
      systemProgram       : anchor.web3.SystemProgram.programId,
    })
    .signers([walletAlice])
    .rpc();
    console.log("    (deposit +2) https://solana.fm/tx/"+tx);
    console.log("");

  });

});


async function getVaultPda(
  program    : anchor.Program<Vault>,
  tag        : String,
  mintAccount: { toBuffer: () => Uint8Array | Buffer; }

) {

  const [pubKey, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from(tag),
      mintAccount.toBuffer(),
    ],
    program.programId
  );

  let pda = {
    pubkey: pubKey,
    bump  : bump,
  };

  return pda;
}


async function logTransaction(
    connection,
    txHash
  ) {
  const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature: txHash,
  });

  console.log(
    `    https://explorer.solana.com/tx/${txHash}`
  );

}