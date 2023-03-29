import fetchURL from "../../utils/fetchURL"
import { Chain } from "@defillama/sdk/build/general";
import { SimpleAdapter } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";
import customBackfill from "../../helpers/customBackfill";
import { getUniqStartOfTodayTimestamp } from "../../helpers/getUniSubgraphVolume";
import axios from "axios";

const historicalVolumeEndpoint = "https://www.vanswap.org/info/DayDatas?first=1000&date=1577836800"

interface IVolumeall {
  dailyVolumeUSD: string;
  date: number;
}

const fetch = async (timestamp: number) => {
  const dayTimestamp = getUniqStartOfTodayTimestamp(new Date(timestamp * 1000))
  const historicalVolume: IVolumeall[] = (await axios.post(historicalVolumeEndpoint))?.data.result;
  const totalVolume = historicalVolume
    .filter(volItem => (new Date(volItem.date).getTime()) <= dayTimestamp)
    .reduce((acc, { dailyVolumeUSD }) => acc + Number(dailyVolumeUSD), 0)

  const dailyVolume = historicalVolume
    .find(dayItem => (new Date(dayItem.date).getTime()) === dayTimestamp)?.dailyVolumeUSD

  return {
    totalVolume: `${totalVolume}`,
    dailyVolume: dailyVolume ? `${dailyVolume}` : undefined,
    timestamp: dayTimestamp,
  };
};

const getStartTimestamp = async () => {
  //const historicalVolume: IVolumeall[] = (await axios.post(historicalVolumeEndpoint))?.data.result;
  //return (new Date(historicalVolume[0].date).getTime());
  return 1647302400
}

const adapter: SimpleAdapter = {
  adapter: {
    [CHAIN.VISION]: {
      fetch,
      start: getStartTimestamp
    },
  },
};

export default adapter;
