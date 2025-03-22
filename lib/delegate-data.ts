// This file contains the delegate data shared between pages
export interface Delegate {
  id: number;
  name: string;
  address: string;
  image: string;
  rewardAPR: string;
  votingPower?: number;
  activeProposals?: number;
  totalDelegations?: number;
  performance7D?: number;
  bio?: string;
  status?: string;
  rating?: number;
  externalLink?: string; // Add this property for external URLs
}

export const delegatesData: Delegate[] = [
  {
    id: 1,
    name: "a16z",
    address: "0x123..4567",
    image: "/delegates/a16z.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x9aa835bc7b8ce13b9b0c9764a52fbf71ac62ccf1",
  },
  {
    id: 2,
    name: "Gauntlet",
    address: "0x123..4567",
    image: "/delegates/gauntlet.png",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x683a4f9915d6216f73d6df50151725036bd26c02",
  },
  {
    id: 3,
    name: "Geoffrey Hayes",
    address: "0x123..4567",
    image: "/delegates/geoffrey-hayes.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x8169522c2c57883e8ef80c498aab7820da539806",
  },
  {
    id: 4,
    name: "Tennis Bowling",
    address: "0x123..4567",
    image: "/delegates/tennis-bowling.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0xc3aae58ab81663872dd36d73613eb295b167f546",
  },
  {
    id: 5,
    name: "Monet Supply",
    address: "0x123..4567",
    image: "/delegates/monet-supply.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/monetsupply.eth",
  },
  {
    id: 6,
    name: "allthecolors",
    address: "0x123..4567",
    image: "/delegates/all-the-colors.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/allthecolors.eth",
  },
  {
    id: 7,
    name: "Wintermute",
    address: "0x123..4567",
    image: "/delegates/wintermute.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/wintermutegovernance.eth",
  },
  {
    id: 8,
    name: "Arr00",
    address: "0x123..4567",
    image: "/delegates/arr00.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/arr00.eth",
  },
  {
    id: 9,
    name: "Franklin DAO",
    address: "0x123..4567",
    image: "/delegates/franklin-dao.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/upennblockchain.eth",
  },
  {
    id: 10,
    name: "Michigan Blockchain",
    address: "0x123..4567",
    image: "/delegates/mich.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/michiganblockchain.eth",
  },
  {
    id: 11,
    name: "P Gov",
    address: "0x123..4567",
    image: "/delegates/pgov.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x3fb19771947072629c8eee7995a2ef23b72d4c8a",
  },
  {
    id: 12,
    name: "Avantgarde",
    address: "0x123..4567",
    image: "/delegates/avantgarde.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0xb49f8b8613be240213c1827e2e576044ffec7948",
  },
  {
    id: 13,
    name: "blck",
    address: "0x123..4567",
    image: "/delegates/blck.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x54a37d93e57c5da659f508069cf65a381b61e189",
  },
  {
    id: 14,
    name: "Bryan Colligan",
    address: "0x123..4567",
    image: "/delegates/bryan-colligan.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x2210dc066aacb03c9676c4f1b36084af14ccd02e",
  },
  {
    id: 15,
    name: "Event Horizon",
    address: "0x123..4567",
    image: "/delegates/event-horizon.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0xb35659cbac913d5e4119f2af47fd490a45e2c826",
  },
  {
    id: 16,
    name: "blockchainUCLA",
    address: "0x123..4567",
    image: "/delegates/blockchainUCLA.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/blockchainatucla.eth",
  },
  {
    id: 17,
    name: "CalBlockchain",
    address: "0x123..4567",
    image: "/delegates/cal-blockchain.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x7ae109a63ff4dc852e063a673b40bed85d22e585",
  },
  {
    id: 18,
    name: "she256",
    address: "0x123..4567",
    image: "/delegates/she256.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/she256.eth",
  },
  {
    id: 19,
    name: "Arana Digital",
    address: "0x123..4567",
    image: "/delegates/arana-digital.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x0579a616689f7ed748dc07692a3f150d44b0ca09",
  },
  {
    id: 20,
    name: "ResevoirDAO",
    address: "0x123..4567",
    image: "/delegates/resevoirDAO.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x4f894bfc9481110278c356ade1473ebe2127fd3c",
  },
  {
    id: 21,
    name: "Blockchain at Columbia",
    address: "0x123..4567",
    image: "/delegates/columbia.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/blockchaincolumbia.eth",
  },
  {
    id: 22,
    name: "hi_Reverie",
    address: "0x123..4567",
    image: "/delegates/reverie.png",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/reveriegov.eth",
  },
  {
    id: 23,
    name: "Dragonfly Capital",
    address: "0x123..4567",
    image: "/delegates/dragonfly-capital.png",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x50495480cce225c8476e90466d8615a9e6a5e004",
  },
  {
    id: 24,
    name: "holonaut.eth",
    address: "0x123..4567",
    image: "/delegates/holonaut.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/holonaut.eth",
  },
  {
    id: 25,
    name: "dakeshi",
    address: "0x123..4567",
    image: "/delegates/dakeshi.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/dakeshi.eth",
  },
  {
    id: 26,
    name: "DeFi Pulse Index",
    address: "0x123..4567",
    image: "/delegates/defi-pulse-index.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0xf63ec662753b88c3634ae276ba4ea28d681478c8",
  },
  {
    id: 27,
    name: "Sharp",
    address: "0x123..4567",
    image: "/delegates/sharp.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x72c58877ef744b86f6ef416a3be26ec19d587708",
  },
  {
    id: 28,
    name: "Scopelift",
    address: "0x123..4567",
    image: "/delegates/scopelift.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/scopelift.eth",
  },
  {
    id: 29,
    name: "Argonaut",
    address: "0x123..4567",
    image: "/delegates/argonaut.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0x21b3b193b71680e2fafe40768c03a0fd305efa75",
  },
  {
    id: 30,
    name: "b0x.eth",
    address: "0x123..4567",
    image: "/delegates/b0x.png",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/b0x.eth",
  },
  {
    id: 31,
    name: "Polychain Capital",
    address: "0x123..4567",
    image: "/delegates/polychain-capital.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0xea6c3db2e7fca00ea9d7211a03e83f568fc13bf7",
  },
  {
    id: 32,
    name: "Michael Lewellen",
    address: "0x123..4567",
    image: "/delegates/michael-lewellen.jpg",
    rewardAPR: "0.00%",
    externalLink: "https://www.tally.xyz/gov/compound/delegate/0xbe1d294fd9b71ae2f6831eb80777ff73fb73c953",
  },
];

// Helper function to format a name for URL slugs
export const formatNameForURL = (name: string) => {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

// Helper function to format the name for display (remove spaces)
export const formatNameForDisplay = (name: string) => {
  return name.replace(/\s+/g, ""); // Remove all spaces
};

// Helper function to find a delegate by slug
export const findDelegateBySlug = (slug: string): Delegate | undefined => {
  return delegatesData.find((delegate) => formatNameForURL(delegate.name) === slug);
};