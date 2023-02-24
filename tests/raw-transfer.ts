import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { RawTransfer } from "../target/types/raw_transfer";
import {SolanaConfigService} from '@coin98/solana-support-library/config'   
import {
  createMint,
  createTransferInstruction,
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'; 
import { AccountMeta, Connection, LAMPORTS_PER_SOL, Transaction, TransactionInstruction } from "@solana/web3.js";

describe("raw-transfer", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.RawTransfer as Program<RawTransfer>;
  let payer: anchor.web3.Keypair;
  let recipient: anchor.web3.Keypair;
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');

  before(async () => {
    payer = await SolanaConfigService.getDefaultAccount();
    console.log('payer', payer);
    recipient = anchor.web3.Keypair.generate();;
    console.log('recipient', recipient.publicKey);
    
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

  // Create spl token
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    9 // We are using 9 to match the CLI decimal default exactly
  );
  console.log('Mint', mint.toBase58());

  const mintInfo = await getMint(connection, mint)
  console.log('Mint info', mintInfo.address);

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
  console.log('Sender account before mint',senderAccountBeforeMint.amount);

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
  console.log('Sender ATA after mint:', senderAccountAfterMint.amount);

  const recipientATA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipient.publicKey
  )
  console.log('Recipient ATA before send', (await getAccount(connection, recipientATA.address)).amount);

  const tx = await program.methods.sendSplToken(new anchor.BN(100 * LAMPORTS_PER_SOL)).accounts({
    payer: payer.publicKey,
    sender: payer.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    senderToken: senderATA.address,
    recipientToken: recipientATA.address
  }).signers([payer]).rpc();

  console.log("Transaction", tx);

  await new Promise(f => setTimeout(f, 100));

  console.log('Sender ATA after send:',  (await getAccount(connection, senderATA.address)).amount);
  console.log('Recipient ATA after send:', (await getAccount(connection, recipientATA.address)).amount);

  // Create transaction
  // const transaction = new Transaction();
  // const accountsInstruction : AccountMeta[] = [
  //   <AccountMeta>{ pubkey: senderATA.address, isSigner: false, isWritable: true },
  //   <AccountMeta>{ pubkey: recipientATA.address, isSigner: false, isWritable: true },
  //   <AccountMeta>{ pubkey: payer.publicKey, isSigner: true, isWritable: false },
  // ];

  // const instruction = new TransactionInstruction({
  //   keys: accountsInstruction,
  //   programId: TOKEN_PROGRAM_ID,
  //   data: 
  // })

  })
});
