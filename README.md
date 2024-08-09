# Asset manager's vault

## Deployed program

**Program Id:** `8uot8k7km7RtdkxFfXGG2nrRd8CxAG4p2SNJ5sSpmQaz`

**On devnet : [Solana Explorer Link](https://solana.fm/address/8uot8k7km7RtdkxFfXGG2nrRd8CxAG4p2SNJ5sSpmQaz/transactions?cluster=localnet-solana)**

**Changing the cluster environnement**
```bash
solana config set --url devnet
```

**Create and set wallet if needed**
```bash
solana-keygen new --outfile ~/.config/solana/devnet.json
solana config set --keypair ~/.config/solana/devnet.json
solana airdrop 2
```

**Update : Anchor.toml**
```toml
[programs.devnet]
my_program = "8uot8k7km7RtdkxFfXGG2nrRd8CxAG4p2SNJ5sSpmQaz"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/devnet.json"
# cluster = "Localnet"
# wallet = "~/.config/solana/id.json"
```

**Build and deploy**
```bash
anchor build
anchor deploy
```

>**Program Id:** 8uot8k7km7RtdkxFfXGG2nrRd8CxAG4p2SNJ5sSpmQaz
>
> Deploy success


## Overview

![](2024-08-06-08-27-27.png)

**Exercise:** Build an **asset manager’s vault**, where customers can deposit SPL tokens of their choice. The vault manager should not be able to withdraw the vault’s funds

Topics in this exercice :
- Rust
- Anchor
- PDA
- init_if_needed
- CPI
- ATA creation
- Token transfer
- Build & deploy on devnet

### Components

- This Anchor program defines a vault that allows users to deposit SPL tokens into a secure account managed by a PDA.
- The PDA acts as the authority over the vault, ensuring that only authorized actions can be performed.
- The program is designed with error handling and careful account validation to prevent unauthorized access or insufficient funds errors.

1. Program & instructions
    - **Initialization**: `initialize()`, a function to set up initial state or accounts required by the program. In this case, it just logs "INITIALIZE" and does nothing else.
    - **Depose tokens**: `deposit()`, the function to deposit SPL tokens into the vault. It performs checks and transfers tokens.

2. Accounts

    **Initialize Struct**
    ```rust
    #[derive(Accounts)]
    pub struct Initialize<'info> {
        ...
    }
    ```
    - **`#[derive(Accounts)]`**: This macro implements necessary traits for the struct to be used in a context (e.g., in `Context<Initialize>`).
    - **`token_account_owner_pda: AccountInfo<'info>`**: An unchecked account that represents the PDA (Program Derived Address) which will own the token vault. It's marked as `CHECK`, meaning it requires extra care as it's not automatically validated by Anchor.
    - **`signer: Signer<'info>`**: The account that signs the transaction and pays for the transaction fees.
    - **`system_program: Program<'info, System>`**: The Solana System Program, which is necessary for account initialization.
    - **`token_program: Program<'info, Token>`**: The SPL Token program, used for handling tokens.
    - **`rent: Sysvar<'info, Rent>`**: A system variable that provides the current rent exemption status.

    **Deposit Struct**
    ```rust
    #[derive(Accounts)]
    pub struct Deposit<'info> {
        ...
    }
    ```
    - **`token_account_owner_pda: AccountInfo<'info>`**: Similar to the Initialize struct, this is the PDA that will own the vault.
    - **`vault: Account<'info, TokenAccount>`**: The vault account where tokens will be stored. It is created if needed (`init_if_needed`), associated with the mint and owned by the PDA.
    - **`signer: Signer<'info>`**: The user who is depositing tokens.
    - **`mint_account: Account<'info, Mint>`**: The mint account for the tokens being deposited.
    - **`sender_token_account: Account<'info, TokenAccount>`**: The token account from which tokens will be transferred.
    - **`token_program: Program<'info, Token>`**: The SPL Token program.
    - **`system_program: Program<'info, System>`**: The system program, required for account initialization.

3. **Error Handling**
    ```rust
    #[error_code]
    pub enum VaultError {
        #[msg("Insufficient Funds.")]
        InsufficientFunds,
    }
    ```

    - **`#[error_code]`**: This macro defines custom error codes for the program. It allows the program to return specific errors that can be handled by the client.
    - **`VaultError`**: This enum defines possible errors, such as "Insufficient Funds", which is used when a user tries to deposit more tokens than they have.


4. **CPI Context and Token Transfer**
    ```rust
    let transfer_instruction: anchor_spl::token::Transfer = Transfer {
        from:      ctx.accounts.sender_token_account.to_account_info(),
        to:        ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.signer.to_account_info(),
    };

    let cpi_ctx: CpiContext<anchor_spl::token::Transfer> = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_instruction,
    );

    anchor_spl::token::transfer(cpi_ctx, amount)?;
    ```

    - **Transfer**: A struct defining the details of the token transfer, specifying the source account, destination account, and authority.
    - **CpiContext**: Context for a cross-program invocation (CPI). This wraps the transfer instruction and provides the necessary program information.
    - **anchor_spl::token::transfer**: This function performs the token transfer.


## Tree repository

```bash
.
├── app
├── migrations
│   └── deploy.ts
├── programs
│   └── vault
│       ├── src
│       │   └── lib.rs
│       ├── Cargo.toml
│       └── Xargo.toml
├── tests
│   └── vault.ts
├── 2024-08-06-08-27-27.png
├── Anchor.toml
├── Cargo.lock
├── Cargo.toml
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json
└── yarn.lock

6 directories, 14 files
```

## Launch

### Local validator

`solana-test-validator --reset`

⚠️ Beware it creates local files and directories at the current working directory.


### Real-time logs display

`solana logs`


### Local deploy and launch tests

`anchor test --skip-local-validator`

## Versions

```
rustc 1.79.0 (129f3b996 2024-06-10)
cargo 1.79.0 (ffa9cf99a 2024-06-03)
solana-cli 1.18.17 (src:b685182a; feat:4215500110, client:SolanaLabs)
anchor-cli 0.29.0
yarn 1.22.22
node v18.17.0
npm 9.6.7
```

`cargo build-sbf -V`
```
solana-cargo-build-sbf 1.18.17
platform-tools v1.41
rustc 1.75.0
```

## Resources
- Learn about CPIs: https://solana.com/docs/core/cpi (Important)
- Overview of Anchor: https://www.anchor-lang.com/docs/high-level-overview
- More about PDAs: https://solanacookbook.com/core-concepts/pdas.html#facts
- Slides: https://pitch.com/v/anchor-dudz4a
- CPI code for transferring tokens: https://github.com/solana-developers/program-examples/blob/main/tokens/transfer-tokens/anchor/programs/transfer-tokens/src/instructions/transfer.rs (Very handy)
- [Transferring SOL and building a payment splitter: &quot;msg.value&quot; in Solana](https://www.rareskills.io/post/anchor-transfer-sol)
- [Cross Program Invocation in Anchor](https://www.rareskills.io/post/cross-program-invocation)
- [PDA (Program Derived Address) vs Keypair Account in Solana](https://www.rareskills.io/post/solana-pda)
- [Solana Playground| Spl Token Vault](https://beta.solpg.io/tutorials/spl-token-vault)
