import fetchURL from "../../utils/fetchURL"
import { ChainBlocks, FetchOptions, SimpleAdapter } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";

const historicalVolumeEndpoint = "https://bisq.markets/bisq/api/markets/volumes?interval=day"

interface IVolumeall {
  volume: string;
  period_start: number;
}

const fetch = async (timestamp: number, _: ChainBlocks, {startOfDay, createBalances, }: FetchOptions) => {
  const totalVolume = createBalances()
  const dailyVolume = createBalances()

  const historicalVolume: IVolumeall[] = (await fetchURL(historicalVolumeEndpoint));
  historicalVolume
    .filter(volItem => volItem.period_start <= startOfDay)
    .map(({ volume }) => totalVolume.addCGToken('bitcoin', +volume))

  const dailyVol = historicalVolume
    .find(dayItem => dayItem.period_start === startOfDay)?.volume
  dailyVolume.addCGToken('bitcoin', +(dailyVol as any))

  return { 
    // totalVolume, 
    dailyVolume, timestamp: startOfDay };
};

const adapter: SimpleAdapter = {
  adapter: {
    [CHAIN.BITCOIN]: {
      fetch,
      start: 1525651200,
    },
  },
};

export default adapter;
