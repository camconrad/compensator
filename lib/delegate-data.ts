// This file contains the delegate data shared between pages
export interface Delegate {
    id: number
    name: string
    address: string
    image: string
    rewardAPR: string
    votingPower?: number
    activeProposals?: number
    totalDelegations?: number
    performance7D?: number
    bio?: string
    status?: string
    rating?: number
  }
  
  export const delegatesData: Delegate[] = [
    {
      id: 1,
      name: "a16z",
      address: "0x123..4567",
      image: "/delegates/a16z.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 2,
      name: "Gauntlet",
      address: "0x123..4567",
      image: "/delegates/gauntlet.png",
      rewardAPR: "0.00%",
    },
    {
      id: 3,
      name: "Geoffrey Hayes",
      address: "0x123..4567",
      image: "/delegates/geoffrey-hayes.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 4,
      name: "Tennis Bowling",
      address: "0x123..4567",
      image: "/delegates/tennis-bowling.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 5,
      name: "Monet Supply",
      address: "0x123..4567",
      image: "/delegates/monet-supply.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 6,
      name: "allthecolors",
      address: "0x123..4567",
      image: "/delegates/all-the-colors.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 7,
      name: "Wintermute",
      address: "0x123..4567",
      image: "/delegates/wintermute.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 8,
      name: "Arr00",
      address: "0x123..4567",
      image: "/delegates/arr00.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 9,
      name: "Franklin DAO",
      address: "0x123..4567",
      image: "/delegates/franklin-dao.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 10,
      name: "Michigan Blockchain",
      address: "0x123..4567",
      image: "/delegates/mich.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 11,
      name: "P Gov",
      address: "0x123..4567",
      image: "/delegates/pgov.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 12,
      name: "Avantgarde",
      address: "0x123..4567",
      image: "/delegates/avantgarde.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 13,
      name: "blck",
      address: "0x123..4567",
      image: "/delegates/blck.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 14,
      name: "Bryan Colligan",
      address: "0x123..4567",
      image: "/delegates/bryan-colligan.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 15,
      name: "blockchainUCLA",
      address: "0x123..4567",
      image: "/delegates/blockchainUCLA.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 16,
      name: "Event Horizon",
      address: "0x123..4567",
      image: "/delegates/event-horizon.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 17,
      name: "CalBlockchain",
      address: "0x123..4567",
      image: "/delegates/cal-blockchain.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 18,
      name: "she256",
      address: "0x123..4567",
      image: "/delegates/she256.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 19,
      name: "Arana Digital",
      address: "0x123..4567",
      image: "/delegates/arana-digital.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 20,
      name: "ResevoirDAO",
      address: "0x123..4567",
      image: "/delegates/resevoirDAO.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 21,
      name: "Blockchain at Columbia",
      address: "0x123..4567",
      image: "/delegates/columbia.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 22,
      name: "hi_Reverie",
      address: "0x123..4567",
      image: "/delegates/reverie.png",
      rewardAPR: "0.00%",
    },
    {
      id: 23,
      name: "Dragonfly Capital",
      address: "0x123..4567",
      image: "/delegates/dragonfly-capital.png",
      rewardAPR: "0.00%",
    },
    {
      id: 24,
      name: "holonaut.eth",
      address: "0x123..4567",
      image: "/delegates/holonaut.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 25,
      name: "dakeshi",
      address: "0x123..4567",
      image: "/delegates/dakeshi.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 26,
      name: "DeFi Pulse Index",
      address: "0x123..4567",
      image: "/delegates/defi-pulse-index.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 27,
      name: "Sharp",
      address: "0x123..4567",
      image: "/delegates/sharp.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 28,
      name: "Scopelift",
      address: "0x123..4567",
      image: "/delegates/scopelift.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 29,
      name: "Argonaut",
      address: "0x123..4567",
      image: "/delegates/argonaut.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 30,
      name: "b0x.eth",
      address: "0x123..4567",
      image: "/delegates/b0x.png",
      rewardAPR: "0.00%",
    },
    {
      id: 31,
      name: "Polychain Capital",
      address: "0x123..4567",
      image: "/delegates/polychain-capital.jpg",
      rewardAPR: "0.00%",
    },
    {
      id: 32,
      name: "Michael Lewellen",
      address: "0x123..4567",
      image: "/delegates/michael-lewellen.jpg",
      rewardAPR: "0.00%",
    },
  ]
  
  // Helper function to format a name for URL slugs
  export const formatNameForURL = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
  }
  
  // Helper function to format the name for display (remove spaces)
  export const formatNameForDisplay = (name: string) => {
    return name.replace(/\s+/g, "") // Remove all spaces
  }
  
  // Helper function to find a delegate by slug
  export const findDelegateBySlug = (slug: string): Delegate | undefined => {
    return delegatesData.find((delegate) => formatNameForURL(delegate.name) === slug)
  }  