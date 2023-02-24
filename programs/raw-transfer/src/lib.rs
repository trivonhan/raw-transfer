use anchor_lang::prelude::*;

use anchor_lang::solana_program::{
    instruction::{
        Instruction
    },
    system_instruction::{
        transfer
    },
    program::{
        invoke
    }
};

declare_id!("DG5JkWNFNmU7ebXkE9gc9wRF1N5ynd7AjyDBww5NJHRf");

#[derive(AnchorSerialize, AnchorDeserialize, Default)]
pub struct TransferTokenParams {
    pub instruction: u8,
    pub amount: u64,
}

#[program]
pub mod raw_transfer {

    use super::*;

    pub fn send_sol_token(ctx: Context<SolanaTransferToken>, amount: u64) -> Result<()> {
        msg!("Instruction: Transfer {:?} SOL", amount);
        let payer = &ctx.accounts.payer;
        let sender = &ctx.accounts.sender;
        let recipient = &ctx.accounts.recipient;
        let instruction = &transfer(sender.key, recipient.key, amount);
        invoke(&instruction, &[payer.clone(), sender.clone(), recipient.clone()])
            .expect("CPI failed");
        msg!("DEBUG: Transfer Instruction {:?}", instruction);
        Ok(())
    }

    pub fn send_spl_token(ctx :Context<TransferToken>, amount: u64) -> Result<()> {
        msg!("Instruction: Transfer {:?} of {:?}", amount, ctx.accounts.token_program);
        let payer = &ctx.accounts.payer;
        let sender = &ctx.accounts.sender;
        let sender_token = &ctx.accounts.sender_token;
        let recipient_token = &ctx.accounts.recipient_token;
        let token_program = &ctx.accounts.token_program;

        let data = TransferTokenParams {
            instruction: 3,
            amount,
        };

        msg!("Data {:?}", data.amount);

        let data = data.try_to_vec().unwrap();

        msg!("Data {:?}", data);

        let instruction = Instruction{
            program_id: *token_program.key,
            accounts: vec![
                AccountMeta::new(*sender_token.key, false),
                AccountMeta::new(*recipient_token.key, false),
                AccountMeta::new(*sender.key, true)
            ],
            data,
        };
        msg!("DEBUG: TransferToken Instruction {:?}", instruction);
        invoke(&instruction, &[payer.clone(), sender.clone(), sender_token.clone(), recipient_token.clone()])
            .expect("CPI failed");

        Ok(())
    }

}

#[derive(Accounts)]
pub struct SolanaTransferToken<'info> {
    #[account(signer)]
    /// CHECK: Transaction fee payer
    pub payer: AccountInfo<'info>,

    #[account(signer)]
    /// CHECK: Source account to send lamports
    pub sender: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: Source account to receive lamports
    pub recipient: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferToken<'info> {
    #[account(signer)]
    /// CHECK: Transaction fee payer
    pub payer: AccountInfo<'info>,

    #[account(signer)]
    /// CHECK: Source account to send lamports
    pub sender: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: sender token account
    pub sender_token: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: recipient token account
    pub recipient_token: AccountInfo<'info>,

    /// CHECK: Account program of token
    pub token_program: AccountInfo<'info>
}

