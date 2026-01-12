# project summary
This is analysis tools for the lack of relay for your followee for nostr protocol.
Fetch the Followee list and check followee's write relays and review them with user's relay.

- project :"warawo"
- app name :"warawo"
  - This means 藁をも掴む.
- github URL:https://github.com/koteitan/warawo/
- deploy URL:https://koteitan.github.com/warawo/

# specification
## platforms
- Language: TypeScript
- Build tool: Vite
- UI Framework: React
- react-i18next: for internationalization.
- nostr: rx-nostr
 
## layout
- App title
  - `(｡>_<)o--warawo: Nostr Relay Analysis`
- tool bar:
  - as pubkey:[textbox] icon:[  ] [name] [display_name]
- main div:
  - status:
    - [relay status bar]
  - table:
    - You    | [icon] | [name]| [display_name] |          | [relay list]
    - [rank] | [icon] | [name]| [display_name] | Coverage | [relay list]
    - [rank] | [icon] | [name]| [display_name] | Coverage | [relay list]
    - [rank] | [icon] | [name]| [display_name] | Coverage | [relay list]
    ...

### layout notes
- [rank] = integer
- [relay list] = folded relay name without ws:// by sqrt(length) charactors in a row in a panel of rounded square
  - ex. ws://yabu.me -> yabu<br>.me
- [relay status bar]: bar 
  - a status of loading followees' kind:10002 for each relay is displayed by the charactor '█' (U+2588) with a specific color.
    - wait for access: gray
    - connecting: yellow
    - loading: green
    - get EOSE: blue
    - timeout: dark green
    - error to connect: dark yellow
  - the bar elements are sorted in the order above.

# behavior
## on load: load pubkey
- load pubkey from NIP-07 browser extension from bootstrap relays
- if pubkey is not found:
  - display mesasge "put the pubkey"
## on blur after change pubkey: load user relays
- load user's kind:10002 relay list by bootstrap relays
  - time out:7 sec
  - limit:3
  - use the event which has the latest created_at
- set <userrelaylist> variable the found list + bootstrap relays
## on finish loading user relay list
- load user's kind:3 followee list by <userrelaylist>
  - time out:7 sec
  - limit:3
  - use the event which has the latest created_at

## on finish loading user followee list
- show analyze followee button

## on click analyze followee button
- start subscription of followees' kind:10002 list by <userrelaylist>
  - time out:none
  - use batch queue by <batchsize_authors> authors

## on receive followees' kind:10002 (process the following in each event)
- save the kind:10002 and overwrite if this is newer
- analyze the followee's write relays and user's read relays as follows:
  - for each followee:
    - for each followees' write relay:
      - check the write relay is included in user's read relay
        - if it is included in user's read relay:
          - mark the write relay as readable
        - else:
          - mark the write relay as unreadable
      - sort the followee's relay list in that the readable relays are in left, the unreadable ones are in the right.
      - the number of readable relay is the 'coverage' of the followee.
- sort followee rows as follows:
  - the coverage is fewer -> upper
  - the coverage is more -> lower


#bootstrap relays
wss://relay.damus.io
wss://directory.yabu.me
wss://yabu.me
wss://purplepag.es
wss://indexer.coracle.social
wss://temp.iris.to
wss://relay.snort.social

