import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { RawTransfer } from "../target/types/raw_transfer";
import {SolanaConfigService} from '@coin98/solana-support-library/config'   
import {
  Account,
  createMint,
  createTransferInstruction,
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'; 
import { AccountMeta, Connection, LAMPORTS_PER_SOL, Transaction, TransactionInstruction } from "@solana/web3.js";
import { assert } from "chai";

describe("raw-transfer", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.RawTransfer as Program<RawTransfer>;
  let payer: anchor.web3.Keypair;
  let recipient: anchor.web3.Keypair;
  let mint: anchor.web3.PublicKey;
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');

  before(async () => {
    payer = await SolanaConfigService.getDefaultAccount();
    console.log('payer', payer.publicKey.toBase58());
    recipient = anchor.web3.Keypair.generate();;
    console.log('recipient', recipient.publicKey.toBase58());
    // Create spl token
    mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      9 // We are using 9 to match the CLI decimal default exactly
    );
    console.log('Mint account address', mint.toBase58());
  })

  it("Send solana token", async () => {
    const tx = await program.methods.sendSolToken(new anchor.BN(10000000000)).accounts({
      payer: payer.publicKey,
      sender: payer.publicKey,
      recipient: recipient.publicKey
    }).signers([payer]).rpc();

    console.log("Transaction Send solana token", tx);
  });

  it("Send spl token", async () => {

    const mintInfo = await getMint(connection, mint)
    console.log('Mint info', mintInfo.address.toBase58());

    const senderATA = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey
    );
    console.log('Sender ATA', senderATA.address.toBase58());

    const senderAccountBeforeMint = await getAccount(
        connection,
        senderATA.address
    )
    console.log('Sender account before mint',Number(senderAccountBeforeMint.amount));
    assert(Number(senderAccountBeforeMint.amount)==0, "Sender account before mint wrong")

    await mintTo(
      connection,
      payer,
      mint,
      senderATA.address,
      payer.publicKey,
      1000 * LAMPORTS_PER_SOL // because decimals for the mint are set to 9 
    )

    const senderAccountAfterMint = await getAccount(
      connection,
      senderATA.address
    )
    console.log('Sender ATA after mint:', Number(senderAccountAfterMint.amount));
    assert(Number(senderAccountAfterMint.amount) == 1000 * LAMPORTS_PER_SOL, "Mint 1000 SPL token to sender wrong");

    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient.publicKey
    )
    console.log('Recipient ATA before send', Number((await getAccount(connection, recipientATA.address)).amount));
    assert(Number((await getAccount(connection, recipientATA.address)).amount) == 0, "Wrong recipient ATA account")

    const tx = await program.methods.sendSplToken(new anchor.BN(100 * LAMPORTS_PER_SOL)).accounts({
      payer: payer.publicKey,
      sender: payer.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      senderToken: senderATA.address,
      recipientToken: recipientATA.address
    }).signers([payer]).rpc();

    console.log("Transaction", tx);

    await new Promise(f => setTimeout(f, 100));

    assert(Number((await getAccount(connection, senderATA.address)).amount) == 900 * LAMPORTS_PER_SOL, "Transfer fail Sender ATA amount wrong");
    assert(Number((await getAccount(connection, recipientATA.address)).amount) == 100 * LAMPORTS_PER_SOL, "Transfer fail Recipient ATA amount wrong");

    console.log('Sender ATA after send:',  Number((await getAccount(connection, senderATA.address)).amount));
    console.log('Recipient ATA after send:', Number((await getAccount(connection, recipientATA.address)).amount));
  })

  it('Mint SPL token to', async () => {
    const mintInfo = await getMint(connection, mint)
    console.log('Mint info', mintInfo.address.toBase58());

    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient.publicKey
    )
    console.log('Recipient ATA', recipientATA.address.toBase58());

    const tx = await program.methods.mintSplTokenTo(new anchor.BN(100 * LAMPORTS_PER_SOL)).accounts({
      payer: payer.publicKey,
      sender: payer.publicKey,
      mint: mint,
      recipientToken: recipientATA.address,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([payer]).rpc();

    console.log("Transaction", tx);

    await new Promise(f => setTimeout(f, 100));

    assert(Number((await getAccount(connection, recipientATA.address)).amount) == 200 * LAMPORTS_PER_SOL, "Mint fail Recipient ATA amount wrong");
    console.log('Recipient ATA after mint:', Number((await getAccount(connection, recipientATA.address)).amount));

  })
});
