use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    keccak::hash,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{clock::Clock, Sysvar},
};

const CONFIG_SEED: &[u8] = b"config";
const REQUEST_SEED: &[u8] = b"request";
const MAX_RELAYERS: usize = 5;
const MAX_INPUT_BYTES: usize = 1024;
const MAX_OUTPUT_BYTES: usize = 2048;
const REQUEST_ACCOUNT_SIZE: usize = 1
    + 32
    + 32
    + 32
    + 32
    + 4
    + MAX_INPUT_BYTES
    + 8
    + 8
    + 8
    + 32
    + 4
    + MAX_OUTPUT_BYTES
    + 32
    + 8
    + 8;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ConfigAccount {
    pub owner: Pubkey,
    pub citrate_chain_id: u64,
    pub quorum: u8,
    pub relayer_count: u8,
    pub relayers: [Pubkey; MAX_RELAYERS],
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct RequestAccount {
    pub status: u8,
    pub requester: Pubkey,
    pub request_id: [u8; 32],
    pub model_hash: [u8; 32],
    pub input_hash: [u8; 32],
    pub input_len: u32,
    pub input_data: Box<[u8; MAX_INPUT_BYTES]>,
    pub max_price: u64,
    pub deadline: i64,
    pub citrate_request_id: u64,
    pub output_hash: [u8; 32],
    pub output_len: u32,
    pub output_data: Box<[u8; MAX_OUTPUT_BYTES]>,
    pub citrate_block_hash: [u8; 32],
    pub citrate_block_number: u64,
    pub citrate_chain_id: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum GatewayInstruction {
    InitializeConfig {
        citrate_chain_id: u64,
        quorum: u8,
        relayers: Vec<Pubkey>,
    },
    RequestInference {
        request_id: [u8; 32],
        model_hash: [u8; 32],
        input_data: Vec<u8>,
        max_price: u64,
        deadline: i64,
    },
    FinalizeInference {
        output_data: Vec<u8>,
        citrate_request_id: u64,
        citrate_block_hash: [u8; 32],
        citrate_block_number: u64,
    },
    MarkFailed {
        citrate_request_id: u64,
        citrate_block_hash: [u8; 32],
        citrate_block_number: u64,
    },
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let instruction = GatewayInstruction::try_from_slice(input)?;

    match instruction {
        GatewayInstruction::InitializeConfig {
            citrate_chain_id,
            quorum,
            relayers,
        } => initialize_config(program_id, accounts, citrate_chain_id, quorum, relayers),
        GatewayInstruction::RequestInference {
            request_id,
            model_hash,
            input_data,
            max_price,
            deadline,
        } => request_inference(
            program_id, accounts, request_id, model_hash, input_data, max_price, deadline,
        ),
        GatewayInstruction::FinalizeInference {
            output_data,
            citrate_request_id,
            citrate_block_hash,
            citrate_block_number,
        } => finalize_inference(
            program_id,
            accounts,
            output_data,
            citrate_request_id,
            citrate_block_hash,
            citrate_block_number,
        ),
        GatewayInstruction::MarkFailed {
            citrate_request_id,
            citrate_block_hash,
            citrate_block_number,
        } => mark_failed(
            program_id,
            accounts,
            citrate_request_id,
            citrate_block_hash,
            citrate_block_number,
        ),
    }
}

fn initialize_config(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    citrate_chain_id: u64,
    quorum: u8,
    relayers: Vec<Pubkey>,
) -> ProgramResult {
    if quorum == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    if relayers.is_empty() {
        return Err(ProgramError::InvalidArgument);
    }
    if relayers.len() > MAX_RELAYERS {
        return Err(ProgramError::InvalidArgument);
    }

    let account_info_iter = &mut accounts.iter();
    let payer = next_account_info(account_info_iter)?;
    let config_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let (config_pda, config_bump) = Pubkey::find_program_address(&[CONFIG_SEED], program_id);
    if config_pda != *config_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    let space = std::mem::size_of::<ConfigAccount>();
    let rent = solana_program::rent::Rent::get()?;
    let lamports = rent.minimum_balance(space);

    let create_ix = system_instruction::create_account(
        payer.key,
        config_account.key,
        lamports,
        space as u64,
        program_id,
    );

    invoke_signed(
        &create_ix,
        &[
            payer.clone(),
            config_account.clone(),
            system_program.clone(),
        ],
        &[&[CONFIG_SEED, &[config_bump]]],
    )?;

    let mut relayer_array = [Pubkey::default(); MAX_RELAYERS];
    for (idx, relayer) in relayers.iter().enumerate() {
        relayer_array[idx] = *relayer;
    }

    let config = ConfigAccount {
        owner: *payer.key,
        citrate_chain_id,
        quorum,
        relayer_count: relayers.len() as u8,
        relayers: relayer_array,
    };

    config.serialize(&mut &mut config_account.data.borrow_mut()[..])?;
    Ok(())
}

fn request_inference(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    request_id: [u8; 32],
    model_hash: [u8; 32],
    input_data: Vec<u8>,
    max_price: u64,
    deadline: i64,
) -> ProgramResult {
    if input_data.is_empty() || input_data.len() > MAX_INPUT_BYTES {
        return Err(ProgramError::InvalidArgument);
    }

    let account_info_iter = &mut accounts.iter();
    let requester = next_account_info(account_info_iter)?;
    let config_account = next_account_info(account_info_iter)?;
    let request_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !requester.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let (config_pda, _) = Pubkey::find_program_address(&[CONFIG_SEED], program_id);
    if config_pda != *config_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    if request_account.owner != program_id {
        return Err(ProgramError::InvalidAccountData);
    }

    if request_account.data_len() != REQUEST_ACCOUNT_SIZE {
        return Err(ProgramError::InvalidAccountData);
    }

    let (request_pda, request_bump) =
        Pubkey::find_program_address(&[REQUEST_SEED, &request_id], program_id);
    if request_pda != *request_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    let space = REQUEST_ACCOUNT_SIZE;
    let rent = solana_program::rent::Rent::get()?;
    let lamports = rent.minimum_balance(space);

    let create_ix = system_instruction::create_account(
        requester.key,
        request_account.key,
        lamports,
        space as u64,
        program_id,
    );

    invoke_signed(
        &create_ix,
        &[
            requester.clone(),
            request_account.clone(),
            system_program.clone(),
        ],
        &[&[REQUEST_SEED, &request_id, &[request_bump]]],
    )?;

    if request_account.data_len() != REQUEST_ACCOUNT_SIZE {
        return Err(ProgramError::InvalidAccountData);
    }

    let mut input_bytes = Box::new([0u8; MAX_INPUT_BYTES]);
    input_bytes[..input_data.len()].copy_from_slice(&input_data);

    let input_hash = hash(&input_data);

    let request = RequestAccount {
        status: 0,
        requester: *requester.key,
        request_id,
        model_hash,
        input_hash: input_hash.0,
        input_len: input_data.len() as u32,
        input_data: input_bytes,
        max_price,
        deadline,
        citrate_request_id: 0,
        output_hash: [0u8; 32],
        output_len: 0,
        output_data: Box::new([0u8; MAX_OUTPUT_BYTES]),
        citrate_block_hash: [0u8; 32],
        citrate_block_number: 0,
        citrate_chain_id: 0,
    };

    request.serialize(&mut &mut request_account.data.borrow_mut()[..])?;
    msg!("REQUEST:{:?}", request_id);
    Ok(())
}

fn finalize_inference(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    output_data: Vec<u8>,
    citrate_request_id: u64,
    citrate_block_hash: [u8; 32],
    citrate_block_number: u64,
) -> ProgramResult {
    if output_data.is_empty() || output_data.len() > MAX_OUTPUT_BYTES {
        return Err(ProgramError::InvalidArgument);
    }

    let account_info_iter = &mut accounts.iter();
    let config_account = next_account_info(account_info_iter)?;
    let request_account = next_account_info(account_info_iter)?;

    let (config_pda, _) = Pubkey::find_program_address(&[CONFIG_SEED], program_id);
    if config_pda != *config_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    let config = ConfigAccount::try_from_slice(&config_account.data.borrow())?;
    if config.quorum == 0 {
        return Err(ProgramError::InvalidAccountData);
    }

    let mut request = RequestAccount::try_from_slice(&request_account.data.borrow())?;
    let (request_pda, _) =
        Pubkey::find_program_address(&[REQUEST_SEED, &request.request_id], program_id);
    if request_pda != *request_account.key {
        return Err(ProgramError::InvalidSeeds);
    }
    if request.status != 0 {
        return Err(ProgramError::InvalidAccountData);
    }

    let clock = Clock::get()?;
    if request.deadline < clock.unix_timestamp {
        return Err(ProgramError::Custom(1));
    }

    let signer_accounts: Vec<&AccountInfo> = account_info_iter.collect();
    verify_quorum(&config, &signer_accounts)?;

    let mut output_bytes = Box::new([0u8; MAX_OUTPUT_BYTES]);
    output_bytes[..output_data.len()].copy_from_slice(&output_data);

    let output_hash = hash(&output_data);

    request.status = 1;
    request.citrate_request_id = citrate_request_id;
    request.output_hash = output_hash.0;
    request.output_len = output_data.len() as u32;
    request.output_data = output_bytes;
    request.citrate_block_hash = citrate_block_hash;
    request.citrate_block_number = citrate_block_number;
    request.citrate_chain_id = config.citrate_chain_id;

    request.serialize(&mut &mut request_account.data.borrow_mut()[..])?;
    Ok(())
}

fn mark_failed(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    citrate_request_id: u64,
    citrate_block_hash: [u8; 32],
    citrate_block_number: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let config_account = next_account_info(account_info_iter)?;
    let request_account = next_account_info(account_info_iter)?;

    let (config_pda, _) = Pubkey::find_program_address(&[CONFIG_SEED], program_id);
    if config_pda != *config_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    if request_account.owner != program_id {
        return Err(ProgramError::InvalidAccountData);
    }

    let config = ConfigAccount::try_from_slice(&config_account.data.borrow())?;

    let mut request = RequestAccount::try_from_slice(&request_account.data.borrow())?;
    let (request_pda, _) =
        Pubkey::find_program_address(&[REQUEST_SEED, &request.request_id], program_id);
    if request_pda != *request_account.key {
        return Err(ProgramError::InvalidSeeds);
    }
    if request.status != 0 {
        return Err(ProgramError::InvalidAccountData);
    }

    let signer_accounts: Vec<&AccountInfo> = account_info_iter.collect();
    verify_quorum(&config, &signer_accounts)?;

    request.status = 2;
    request.citrate_request_id = citrate_request_id;
    request.citrate_block_hash = citrate_block_hash;
    request.citrate_block_number = citrate_block_number;
    request.citrate_chain_id = config.citrate_chain_id;

    request.serialize(&mut &mut request_account.data.borrow_mut()[..])?;
    Ok(())
}

fn verify_quorum(config: &ConfigAccount, signer_accounts: &[&AccountInfo]) -> ProgramResult {
    let mut unique: [Pubkey; MAX_RELAYERS] = [Pubkey::default(); MAX_RELAYERS];
    let mut count: u8 = 0;

    for signer_info in signer_accounts.iter() {
        if !signer_info.is_signer {
            continue;
        }

        if !is_relayer(config, signer_info.key) {
            return Err(ProgramError::InvalidArgument);
        }

        if is_duplicate(&unique, count as usize, signer_info.key) {
            return Err(ProgramError::InvalidArgument);
        }

        if (count as usize) < MAX_RELAYERS {
            unique[count as usize] = *signer_info.key;
        }
        count += 1;
    }

    if count < config.quorum {
        return Err(ProgramError::Custom(2));
    }

    Ok(())
}

fn is_relayer(config: &ConfigAccount, signer: &Pubkey) -> bool {
    for idx in 0..config.relayer_count as usize {
        if config.relayers[idx] == *signer {
            return true;
        }
    }
    false
}

fn is_duplicate(unique: &[Pubkey; MAX_RELAYERS], count: usize, signer: &Pubkey) -> bool {
    for idx in 0..count {
        if unique[idx] == *signer {
            return true;
        }
    }
    false
}
