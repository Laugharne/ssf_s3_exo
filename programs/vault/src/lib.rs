use anchor_lang::prelude::*;
use std::mem::size_of;

declare_id!("8uot8k7km7RtdkxFfXGG2nrRd8CxAG4p2SNJ5sSpmQaz");

#[program]
pub mod vault {
	use super::*;

	pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
		Ok(())
	}

	pub fn deposit(
		ctx: Context<Deposit>,
		amount: u64,
	) -> Result<()> {
		let vault: &mut Account<Vault> = &mut ctx.accounts.vault;

		vault.signer = ctx.accounts.signer.key();
		vault.amount = vault.amount.checked_add(amount).ok_or(VaultError::Overflow)?;
		vault.bump   = ctx.bumps.vault;
		msg!("amount : {}", vault.amount);
		msg!("bump   : {}", vault.bump);
		Ok(())
	}

	pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
		let vault: &mut Account<Vault> = &mut ctx.accounts.vault;

		vault.amount = 0;
		msg!("amount : {}", vault.amount);
		Ok(())
	}

}

#[error_code]
pub enum VaultError {
	#[msg("Overflow.")]
	Overflow,
}


#[derive(Accounts)]
pub struct Initialize {}


#[account]
pub struct Vault {
	pub signer : Pubkey,
	pub amount:  u64,
	pub bump   : u8,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
	#[account(
		init_if_needed,
		seeds = [
			b"SSF_VAULT".as_ref(),
			signer.key().as_ref(),
		],
		bump,
		payer = signer,
		space = size_of::<Vault>() + 8
	)]
	pub vault: Account<'info, Vault>,

	#[account(mut)]
	pub signer: Signer<'info>,

	pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {

	#[account(
		seeds = [
			b"SSF_VAULT".as_ref(),
			signer.key().as_ref(),
		],
		bump=vault.bump,
	)]
	pub vault: Account<'info, Vault>,

	#[account(mut)]
	pub signer: Signer<'info>,

	pub system_program: Program<'info, System>,

}


