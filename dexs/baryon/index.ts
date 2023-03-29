import { Fetch, Adapter } from "../../adapters/types";

import fetchURL from "../../utils/fetchURL"
const { BSC } = require("../../helpers/chains");

const endpoints = {
  [BSC]: "https://api.baryon.network/program/info",
};

const graphs: Fetch = async (_timestamp: number) => {
  let res = await fetchURL(endpoints[BSC]);

  return {
    timestamp: Math.trunc(Date.now() / 1000),
    dailyVolume: res?.data?.volume24h,
    totalVolume: res?.data?.totalvolume,
  };
};

export default {
  adapter: {
    [BSC]: {
      fetch: graphs,
      runAtCurrTime: true,
      start: async () => 0
    },
  },
} as Adapter;