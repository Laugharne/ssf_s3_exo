use anchor_lang::prelude::*;

declare_id!("8uot8k7km7RtdkxFfXGG2nrRd8CxAG4p2SNJ5sSpmQaz");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
