use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};


declare_id!("8uot8k7km7RtdkxFfXGG2nrRd8CxAG4p2SNJ5sSpmQaz");

#[program]
pub mod vault {
	use super::*;

	pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
		msg!("INITIALIZE");
		Ok(())
	}

	pub fn deposit(
		ctx: Context<Deposit>,
		amount: u64,
	) -> Result<()> {

		msg!("amount : {}", amount);
		//msg!("signer : {}", ctx.accounts.signer.key());
		let sender_token_account: &Account<TokenAccount> = &ctx.accounts.sender_token_account;

		// Check if the sender has enough tokens
		if sender_token_account.amount < amount {
			return Err(VaultError::InsufficientFunds.into());
		}

		msg!("sender amount : {}", sender_token_account.amount);

		let transfer_instruction: anchor_spl::token::Transfer = Transfer {
			from     : ctx.accounts.sender_token_account.to_account_info(),
			to       : ctx.accounts.vault.to_account_info(),
			authority: ctx.accounts.signer.to_account_info(),
		};

		let cpi_ctx: CpiContext<anchor_spl::token::Transfer> = CpiContext::new(
			ctx.accounts.token_program.to_account_info(),
			transfer_instruction,
		);

		anchor_spl::token::transfer(cpi_ctx, amount)?;

		Ok(())
	}


}




#[derive(Accounts)]
pub struct Initialize<'info> {
	#[account(
		init_if_needed,
		payer = signer,
		seeds = [b"SSF_ACCOUNT_VAULT"],
		bump,
		space = 8
	)]
	/// CHECK: Struct field "token_account_owner_pda" is unsafe, but is not documented.
	token_account_owner_pda: AccountInfo<'info>,

	#[account(mut)]
	signer: Signer<'info>,

	system_program: Program<'info, System>,
	token_program:  Program<'info, Token>,
	rent: Sysvar<'info, Rent>,

}

#[derive(Accounts)]
pub struct Deposit<'info> {

	#[account(mut,
		seeds=[b"SSF_ACCOUNT_VAULT"],
		bump
	)]
	/// CHECK: Struct field "token_account_owner_pda" is unsafe, but is not documented.
	token_account_owner_pda: AccountInfo<'info>,

	#[account(
		init_if_needed,
		seeds = [
			b"SSF_PDA_VAULT".as_ref(),
			mint_account.key().as_ref()
		],
		token::mint      = mint_account,
		token::authority = token_account_owner_pda,
		payer            = signer,
		bump
	)]
	pub vault: Account<'info, TokenAccount>,

	#[account(mut)]
	pub signer: Signer<'info>,

	pub mint_account: Account<'info, Mint>,

	#[account(mut)]
	pub sender_token_account: Account<'info, TokenAccount>,

	pub token_program:  Program<'info, Token>,
	pub system_program: Program<'info, System>,
}


#[error_code]
pub enum VaultError {
	// #[msg("Overflow.")]
	// Overflow,

	#[msg("Insufficient Funds.")]
	InsufficientFunds,
}

