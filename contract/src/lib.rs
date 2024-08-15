#![no_std]

use soroban_sdk::{contract, contracttype, Map, contractimpl, Env, String, Address, token, log, Vec, vec };

#[contracttype]
pub enum DataKey {
    Index,
    Entries(String),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Entry {
    pub id: String,
    pub apr: i128,
    pub tvl: i128,
    pub escrow: i128,
    pub shares: Map<Address, i128>,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn set_entry(e: Env, entry: Entry) {
        let key = DataKey::Entries(entry.id.clone());
        e.storage().instance().set(&key, &entry);

        let mut index: Vec<String> = e.storage().instance().get(&DataKey::Index).unwrap_or(vec![&e]);
        index.push_back(entry.id.clone());
        e.storage().instance().set(&DataKey::Index, &index);
    }
    

    pub fn get_entry(e: &Env, id: String) -> Entry {
        let key = DataKey::Entries(id);

        e.storage().instance().get(&key).unwrap()
    }

    pub fn sync_entries(e: Env, ids: Vec<String>) {
        let mut index: Vec<String> = e.storage().instance().get(&DataKey::Index).unwrap_or(vec![&e]);
        
        for id in ids {
            if !index.contains(&id) {
                // Entry does not exist, create it with default values
                let entry = Entry {
                    id: id.clone(),
                    apr: 0,
                    tvl: 0,
                    escrow: 0,
                    shares: Map::new(&e),
                };
                
                // Add the new entry to storage
                let key = DataKey::Entries(id.clone());
                e.storage().instance().set(&key, &entry);
                
                // Append the new entry's ID to the index
                index.push_back(id);
            }
        }
        
        // Update the index in storage
        e.storage().instance().set(&DataKey::Index, &index);
    }
     
    pub fn invest(e: Env, user: Address, id: String, amount: i128) {
        user.require_auth();
        let download_amount = 3000000;
        let key = DataKey::Entries(id.clone());
        let mut entry: Entry = e.storage().instance().get(&key).unwrap();

        // Update equity share
        let past_user_equity = entry.shares.get(user.clone()).unwrap_or(0);

        if amount > download_amount {
            entry.shares.set(user.clone(), past_user_equity + amount);
             log!(&e, "Got equity!");
            entry.tvl += amount;
        } 
        
        entry.escrow += amount;
        entry.apr = get_apr(&e, entry.clone());

        // Save updated entry
        e.storage().instance().set(&key, &entry);
        transfer(&e, &user, &e.current_contract_address(), amount);
    }

    pub fn distribute_payout(e: Env, id: String) {
        let key = DataKey::Entries(id.clone());
        let mut entry: Entry = e.storage().instance().get(&key).unwrap();
        for (user, equity) in entry.shares.iter() {
            let user_payout = (entry.escrow / 365) * (equity / entry.tvl);
            entry.escrow -= user_payout;
            entry.apr = get_apr(&e, entry.clone());

            e.storage().instance().set(&key, &entry);
            log!(&e, "Payout {}!", user_payout);
            transfer(&e, &e.current_contract_address(), &user, user_payout);
        }
    }

    pub fn distribute_payouts(e: Env) {
        let index: Vec<String> = e.storage().instance().get(&DataKey::Index).unwrap_or(vec![&e]);
        for key in index.iter() {
            // Access each entry by key
            log!(&e,"Key: {}", key);
            Self::distribute_payout(e.clone(), key);
        }
    }
  
}

fn get_apr(_: &Env, entry: Entry) -> i128 {
  if entry.tvl == 0 {
      return 0
  } 
  (entry.escrow * 100 ) / entry.tvl
}

fn transfer(e: &Env, from: &Address, to: &Address, amount: i128) {
    let token_contract_id = &get_xlm_address(e);
    let client = token::Client::new(e, token_contract_id);
    client.transfer(from, to, &amount)
}

fn get_xlm_address(env: &Env) -> Address {

    // futurenet
    // CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT
    // testnet
    // CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
    // mainnet
    // CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA
    
    // testnet
    Address::from_string(&String::from_str(env, "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",))
}

