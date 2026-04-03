use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

const MAX_INPUT_BYTES: usize = 1024;
const MAX_OUTPUT_BYTES: usize = 2048;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct RequestAccount {
    pub status: u8,
    pub requester: Pubkey,
    pub request_id: [u8; 32],
    pub model_hash: [u8; 32],
    pub input_hash: [u8; 32],
    pub input_len: u32,
    pub input_data: [u8; MAX_INPUT_BYTES],
    pub max_price: u64,
    pub deadline: i64,
    pub citrate_request_id: u64,
    pub output_hash: [u8; 32],
    pub output_len: u32,
    pub output_data: [u8; MAX_OUTPUT_BYTES],
    pub citrate_block_hash: [u8; 32],
    pub citrate_block_number: u64,
    pub citrate_chain_id: u64,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _input: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let request_account = next_account_info(account_info_iter)?;

    let request = RequestAccount::try_from_slice(&request_account.data.borrow())?;

    if request.status != 1 {
        return Err(ProgramError::InvalidAccountData);
    }

    let output_len = request.output_len as usize;
    if output_len == 0 || output_len > MAX_OUTPUT_BYTES {
        return Err(ProgramError::InvalidAccountData);
    }

    msg!("Citrate request complete");
    msg!("request_id: 0x{}", hex_string(&request.request_id));
    msg!("output_hash: 0x{}", hex_string(&request.output_hash));
    msg!("output_len: {}", output_len);
    msg!(
        "output_data: 0x{}",
        hex_string(&request.output_data[..output_len])
    );

    Ok(())
}

fn hex_string(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}
