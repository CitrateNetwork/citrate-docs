use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;
use solana_program_test::{processor, ProgramTest};
use solana_sdk::{
    account::Account,
    instruction::{AccountMeta, Instruction},
    signature::{Keypair, Signer},
    system_program,
    transaction::Transaction,
};

use citrate_crosschain_gateway::{
    process_instruction, ConfigAccount, GatewayInstruction, RequestAccount,
};

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

fn build_config_account(owner: Pubkey, relayer: Pubkey) -> ConfigAccount {
    let mut relayers = [Pubkey::default(); 5];
    relayers[0] = relayer;
    ConfigAccount {
        owner,
        citrate_chain_id: 40204,
        quorum: 1,
        relayer_count: 1,
        relayers,
    }
}

fn build_request_account(requester: Pubkey, request_id: [u8; 32]) -> RequestAccount {
    let mut input_data = Box::new([0u8; MAX_INPUT_BYTES]);
    input_data[..3].copy_from_slice(&[1u8, 2, 3]);

    RequestAccount {
        status: 0,
        requester,
        request_id,
        model_hash: [2u8; 32],
        input_hash: [3u8; 32],
        input_len: 3,
        input_data,
        max_price: 10,
        deadline: 2_000_000_000,
        citrate_request_id: 0,
        output_hash: [0u8; 32],
        output_len: 0,
        output_data: Box::new([0u8; MAX_OUTPUT_BYTES]),
        citrate_block_hash: [0u8; 32],
        citrate_block_number: 0,
        citrate_chain_id: 0,
    }
}

fn serialize_request(request: RequestAccount) -> Vec<u8> {
    let mut data = request.try_to_vec().expect("serialize request");
    data.resize(REQUEST_ACCOUNT_SIZE, 0);
    data
}

fn serialize_config(config: ConfigAccount) -> Vec<u8> {
    config.try_to_vec().expect("serialize config")
}

#[tokio::test]
async fn finalize_inference_updates_request() {
    let program_id = Pubkey::new_unique();
    let relayer = Keypair::new();

    let request_id = [9u8; 32];
    let (config_pda, _) = Pubkey::find_program_address(&[b"config"], &program_id);
    let (request_pda, _) = Pubkey::find_program_address(&[b"request", &request_id], &program_id);

    let mut program_test = ProgramTest::new(
        "citrate_crosschain_gateway",
        program_id,
        processor!(process_instruction),
    );

    let config = build_config_account(Pubkey::new_unique(), relayer.pubkey());
    program_test.add_account(
        config_pda,
        Account {
            lamports: 1_000_000_000,
            data: serialize_config(config),
            owner: program_id,
            executable: false,
            rent_epoch: 0,
        },
    );

    let request = build_request_account(Pubkey::new_unique(), request_id);
    program_test.add_account(
        request_pda,
        Account {
            lamports: 1_000_000_000,
            data: serialize_request(request),
            owner: program_id,
            executable: false,
            rent_epoch: 0,
        },
    );

    program_test.add_account(
        relayer.pubkey(),
        Account {
            lamports: 1_000_000_000,
            data: Vec::new(),
            owner: system_program::id(),
            executable: false,
            rent_epoch: 0,
        },
    );

    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    let instruction = GatewayInstruction::FinalizeInference {
        output_data: vec![4u8, 5, 6],
        citrate_request_id: 42,
        citrate_block_hash: [7u8; 32],
        citrate_block_number: 99,
    };

    let ix = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new_readonly(config_pda, false),
            AccountMeta::new(request_pda, false),
            AccountMeta::new_readonly(relayer.pubkey(), true),
        ],
        data: instruction.try_to_vec().expect("serialize instruction"),
    };

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer, &relayer],
        recent_blockhash,
    );

    banks_client.process_transaction(tx).await.expect("finalize tx");

    let updated = banks_client
        .get_account(request_pda)
        .await
        .expect("get account")
        .expect("account missing");

    let updated_request = RequestAccount::try_from_slice(&updated.data).expect("decode");
    assert_eq!(updated_request.status, 1);
    assert_eq!(updated_request.output_len, 3);
    assert_eq!(updated_request.citrate_request_id, 42);
}

#[tokio::test]
async fn mark_failed_updates_request() {
    let program_id = Pubkey::new_unique();
    let relayer = Keypair::new();

    let request_id = [1u8; 32];
    let (config_pda, _) = Pubkey::find_program_address(&[b"config"], &program_id);
    let (request_pda, _) = Pubkey::find_program_address(&[b"request", &request_id], &program_id);

    let mut program_test = ProgramTest::new(
        "citrate_crosschain_gateway",
        program_id,
        processor!(process_instruction),
    );

    let config = build_config_account(Pubkey::new_unique(), relayer.pubkey());
    program_test.add_account(
        config_pda,
        Account {
            lamports: 1_000_000_000,
            data: serialize_config(config),
            owner: program_id,
            executable: false,
            rent_epoch: 0,
        },
    );

    let request = build_request_account(Pubkey::new_unique(), request_id);
    program_test.add_account(
        request_pda,
        Account {
            lamports: 1_000_000_000,
            data: serialize_request(request),
            owner: program_id,
            executable: false,
            rent_epoch: 0,
        },
    );

    program_test.add_account(
        relayer.pubkey(),
        Account {
            lamports: 1_000_000_000,
            data: Vec::new(),
            owner: system_program::id(),
            executable: false,
            rent_epoch: 0,
        },
    );

    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    let instruction = GatewayInstruction::MarkFailed {
        citrate_request_id: 55,
        citrate_block_hash: [8u8; 32],
        citrate_block_number: 101,
    };

    let ix = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new_readonly(config_pda, false),
            AccountMeta::new(request_pda, false),
            AccountMeta::new_readonly(relayer.pubkey(), true),
        ],
        data: instruction.try_to_vec().expect("serialize instruction"),
    };

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer, &relayer],
        recent_blockhash,
    );

    banks_client.process_transaction(tx).await.expect("mark failed tx");

    let updated = banks_client
        .get_account(request_pda)
        .await
        .expect("get account")
        .expect("account missing");

    let updated_request = RequestAccount::try_from_slice(&updated.data).expect("decode");
    assert_eq!(updated_request.status, 2);
    assert_eq!(updated_request.citrate_request_id, 55);
}

#[tokio::test]
async fn finalize_rejects_invalid_pda() {
    let program_id = Pubkey::new_unique();
    let relayer = Keypair::new();

    let request_id = [2u8; 32];
    let (config_pda, _) = Pubkey::find_program_address(&[b"config"], &program_id);
    let bad_request_pda = Pubkey::new_unique();

    let mut program_test = ProgramTest::new(
        "citrate_crosschain_gateway",
        program_id,
        processor!(process_instruction),
    );

    let config = build_config_account(Pubkey::new_unique(), relayer.pubkey());
    program_test.add_account(
        config_pda,
        Account {
            lamports: 1_000_000_000,
            data: serialize_config(config),
            owner: program_id,
            executable: false,
            rent_epoch: 0,
        },
    );

    let request = build_request_account(Pubkey::new_unique(), request_id);
    program_test.add_account(
        bad_request_pda,
        Account {
            lamports: 1_000_000_000,
            data: serialize_request(request),
            owner: program_id,
            executable: false,
            rent_epoch: 0,
        },
    );

    program_test.add_account(
        relayer.pubkey(),
        Account {
            lamports: 1_000_000_000,
            data: Vec::new(),
            owner: system_program::id(),
            executable: false,
            rent_epoch: 0,
        },
    );

    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    let instruction = GatewayInstruction::FinalizeInference {
        output_data: vec![9u8],
        citrate_request_id: 77,
        citrate_block_hash: [9u8; 32],
        citrate_block_number: 123,
    };

    let ix = Instruction {
        program_id,
        accounts: vec![
            AccountMeta::new_readonly(config_pda, false),
            AccountMeta::new(bad_request_pda, false),
            AccountMeta::new_readonly(relayer.pubkey(), true),
        ],
        data: instruction.try_to_vec().expect("serialize instruction"),
    };

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer, &relayer],
        recent_blockhash,
    );

    assert!(banks_client.process_transaction(tx).await.is_err());
}
