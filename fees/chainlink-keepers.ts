import { BreakdownAdapter, ChainBlocks, FetchResultFees, IJSON } from "../adapters/types";
import { CHAIN } from "../helpers/chains";
import { getTimestampAtStartOfDayUTC, getTimestampAtStartOfNextDayUTC } from "../utils/date";
import { getPrices } from "../utils/prices";
import { getBlock } from "../helpers/getBlock";
import { Chain, getProvider } from "@defillama/sdk/build/general";
import retry from "async-retry";
import getLogs from "../helpers/getLogs";

type TAddrress = {
  [l: string | Chain]: string;
}

const topic0_keeper = '0xcaacad83e47cc45c280d487ec84184eee2fa3b54ebaa393bda7549f13da228f6';
const success_topic = '0x0000000000000000000000000000000000000000000000000000000000000001';
const address_keeper: TAddrress = {
  [CHAIN.ETHEREUM]: '0x7b3EC232b08BD7b4b3305BE0C044D907B2DF960B',
  [CHAIN.BSC]: '0x7b3ec232b08bd7b4b3305be0c044d907b2df960b',
  [CHAIN.POLYGON]: '0x7b3EC232b08BD7b4b3305BE0C044D907B2DF960B',
  [CHAIN.FANTOM]: '0x02777053d6764996e594c3E88AF1D58D5363a2e6',
  [CHAIN.AVAX]: '0x02777053d6764996e594c3E88AF1D58D5363a2e6',
  [CHAIN.ARBITRUM]: '0x75c0530885F385721fddA23C539AF3701d6183D4',
  [CHAIN.OPTIMISM]: '0x75c0530885F385721fddA23C539AF3701d6183D4'
}
interface ITx {
  data: string;
  transactionHash: string;
  topics: string[];
}

type IGasTokenId = {
  [l: string | Chain]: string;
}
const gasTokenId: IGasTokenId = {
  [CHAIN.ETHEREUM]: "coingecko:ethereum",
  [CHAIN.BSC]: "coingecko:binancecoin",
  [CHAIN.POLYGON]: "coingecko:matic-network",
  [CHAIN.FANTOM]: "coingecko:fantom",
  [CHAIN.AVAX]: "coingecko:avalanche-2",
  [CHAIN.ARBITRUM]: "coingecko:ethereum",
  [CHAIN.OPTIMISM]: "coingecko:ethereum"
}

let chainBlocksStore: IJSON<ChainBlocks> | undefined = undefined

const fetchKeeper = (chain: Chain) => {
  return async (timestamp: number, chainBlocks: ChainBlocks): Promise<FetchResultFees> => {
    if (!chainBlocksStore)
      chainBlocksStore = {
        [timestamp]: chainBlocks
      }
    const todaysTimestamp = getTimestampAtStartOfDayUTC(timestamp)
    const yesterdaysTimestamp = getTimestampAtStartOfNextDayUTC(timestamp)

    if (!chainBlocksStore[todaysTimestamp])
      chainBlocksStore[todaysTimestamp] = {}
    const fromBlock = (await getBlock(todaysTimestamp, chain, chainBlocksStore[todaysTimestamp]));
    if (!chainBlocksStore[yesterdaysTimestamp])
      chainBlocksStore[yesterdaysTimestamp] = {}
    const toBlock = (await getBlock(yesterdaysTimestamp, chain, chainBlocksStore[yesterdaysTimestamp]));
    const logs: ITx[] = (await getLogs({
      target: address_keeper[chain],
      topic: '',
      fromBlock: fromBlock,
      toBlock: toBlock,
      topics: [topic0_keeper],
      keys: [],
      chain: chain
    })).output.map((e: any) => { return { ...e, data: e.data.replace('0x', ''), transactionHash: e.transactionHash, } as ITx })
      .filter((e: ITx) => e.topics.includes(success_topic));
    const provider = getProvider(chain);
    const txReceipt: number[] = chain === CHAIN.OPTIMISM ? [] : ((await Promise.all(
      logs.map((e: ITx) => retry(() => provider.getTransactionReceipt(e.transactionHash), { retries: 3 })
      ).map(p => p.catch(() => undefined)))))
      .map((e: any) => {
        const amount = (Number(e.gasUsed._hex) * Number(e.effectiveGasPrice?._hex || 0)) / 10 ** 18
        return amount
      })
    const payAmount: number[] = logs.map((tx: ITx) => {
      const amount = Number('0x' + tx.data.slice(0, 64)) / 10 ** 18
      return amount;
    });
    const linkAddress = "coingecko:chainlink";
    const gasToken = gasTokenId[chain];
    const prices = (await getPrices([linkAddress, gasToken], timestamp))
    const linkPrice = prices[linkAddress].price
    const gagPrice = prices[gasToken].price
    const dailyFees = payAmount.reduce((a: number, b: number) => a + b, 0);
    const dailyFeesUsd = dailyFees * linkPrice;
    const dailyGas = txReceipt.reduce((a: number, b: number) => a + b, 0);
    const dailyGasUsd = dailyGas * gagPrice;
    const dailyRevenue = dailyFeesUsd - dailyGasUsd;
    return {
      dailyFees: dailyFeesUsd.toString(),
      dailyRevenue: chain === CHAIN.OPTIMISM ? undefined : dailyRevenue.toString(),
      timestamp
    }
  }
}

const adapter: BreakdownAdapter = {
  breakdown: {
    "keepers": {
      [CHAIN.ETHEREUM]: {
        fetch: fetchKeeper(CHAIN.ETHEREUM),
        start: async () => 1675382400,
      },
      [CHAIN.BSC]: {
        fetch: fetchKeeper(CHAIN.BSC),
        start: async () => 1675382400,
      },
      [CHAIN.POLYGON]: {
        fetch: fetchKeeper(CHAIN.POLYGON),
        start: async () => 1675382400,
      },
      [CHAIN.FANTOM]: {
        fetch: fetchKeeper(CHAIN.FANTOM),
        start: async () => 1675382400,
      },
      [CHAIN.AVAX]: {
        fetch: fetchKeeper(CHAIN.AVAX),
        start: async () => 1675382400,
      },
      [CHAIN.ARBITRUM]: {
        fetch: fetchKeeper(CHAIN.ARBITRUM),
        start: async () => 1675382400,
      },
      [CHAIN.OPTIMISM]: {
        fetch: fetchKeeper(CHAIN.OPTIMISM),
        start: async () => 1675382400,
      }
    }
  }
}
export default adapter;
