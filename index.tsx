import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ethers, BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import { 
  Search, 
  User, 
  Globe, 
  Twitter, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  CornerDownRight,
  Wallet,
  Loader2,
  Box,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  Settings
} from "lucide-react";

// Add declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// --- Configuration ---
const BASE_CHAIN_ID_HEX = "0x2105"; // 8453
const BASE_CHAIN_ID_DECIMAL = 8453;
const BASE_RPC_URL = "https://mainnet.base.org"; 
const BASE_EXPLORER = "https://basescan.org";

/**
 * Official Base L2 Mainnet Addresses
 */
const REGISTRY_ADDRESS = ethers.getAddress("0xb94704422c2a1e396835a571837aa5ae53285a95");
const RESOLVER_ADDRESS = ethers.getAddress("0xC6d566A56A1aFf6508b41f6c90ff131615583BCD");

/**
 * Helper to convert a .base.eth name into its corresponding node hash.
 */
const toNodeHash = (name: string): string => {
  if (!name) return ethers.ZeroHash;
  return ethers.namehash(name.toLowerCase().trim());
};

/**
 * Helper to resolve an avatar record to a displayable URL.
 */
const resolveAvatarUrl = (name: string, record: string): string => {
  if (!record) return "";
  if (record.startsWith("http")) return record;
  if (record.startsWith("ipfs://")) {
    return record.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return `https://metadata.ens.domains/mainnet/avatar/${name}`;
};

// --- ABIs ---
const REGISTRY_ABI = [
  "function owner(bytes32 node) view returns (address)",
  "function resolver(bytes32 node) view returns (address)",
  "function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external"
];

const RESOLVER_ABI = [
  "function text(bytes32 node, string key) view returns (string)",
  "function addr(bytes32 node) view returns (address)"
];

// --- Types ---
interface ProfileData {
  owner: string;
  resolver: string;
  avatar?: string;
  twitter?: string;
  url?: string;
  address?: string;
  isMine: boolean;
}

// --- Components ---

const BaseLogo = () => (
  <div className="w-8 h-8 bg-base-blue rounded-lg relative overflow-hidden group hover:scale-105 transition-transform duration-300 flex-shrink-0">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity"></div>
  </div>
);

const Card = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white border border-gray-100 rounded-[1.5rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
    {children}
  </div>
);

const PixelCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pSize = 4;
    const cols = Math.ceil(w / pSize);
    const rows = Math.ceil(h / pSize);

    const C_BG = '#000000';
    const C_BLUE = '#0052FF';
    const C_ORANGE = '#F97316'; 
    const C_DARK_BLUE = '#172554';

    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, w, h);

    const terrain = new Float32Array(cols);
    let yOff = rows * 0.7;
    
    for(let i = 0; i < cols; i++) {
        const jaggedness = (Math.random() - 0.5) * 8; 
        const slope = (Math.random() - 0.5) * 2; 
        yOff += jaggedness + slope;
        if(yOff < rows * 0.2) yOff = rows * 0.2 + 2; 
        if(yOff > rows * 0.9) yOff = rows * 0.9 - 2;
        terrain[i] = yOff;
    }

    for(let i = 0; i < cols; i++) {
        const ceiling = terrain[i];
        for(let j = 0; j < rows; j++) {
            if (j > ceiling) {
                const noise = Math.random();
                if (j - ceiling < 2 && noise > 0.3) {
                     ctx.fillStyle = C_BLUE;
                } else if (noise > 0.65) {
                    ctx.fillStyle = C_ORANGE;
                } else if (noise > 0.35) {
                    ctx.fillStyle = C_BLUE;
                } else {
                    ctx.fillStyle = C_DARK_BLUE;
                }
                ctx.fillRect(i * pSize, j * pSize, pSize, pSize);
            }
        }
    }
    
    for(let k = 0; k < 80; k++) {
        const rx = Math.floor(Math.random() * cols);
        const ry = Math.floor(Math.random() * (rows * 0.6));
        if (ry < terrain[rx]) {
             ctx.fillStyle = Math.random() > 0.5 ? C_BLUE : C_ORANGE;
             ctx.fillRect(rx * pSize, ry * pSize, pSize, pSize);
        }
    }
  }, []);

  return (
    <div className="w-full h-full min-h-[300px] bg-black relative overflow-hidden">
        <canvas ref={canvasRef} width={600} height={600} className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
             <div className="flex items-center gap-1 text-white text-[10px] font-mono opacity-80 bg-black/50 px-2 py-1 rounded">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Live on Base
             </div>
        </div>
    </div>
  );
};

const AdBanner = () => (
    <div className="max-w-5xl mx-auto my-16 rounded-[2.5rem] overflow-hidden bg-[#F4F5F6] grid grid-cols-1 md:grid-cols-2 shadow-sm border border-gray-200 group">
        <div className="p-12 flex flex-col justify-center relative">
            <div className="sm:pl-16 text-center sm:text-left z-10">
                <h2 className="text-6xl sm:text-7xl font-[900] tracking-tighter leading-[0.85] text-black mb-8 group-hover:scale-105 transition-transform duration-500 origin-left">
                    Build<br/>Onchain
                </h2>
                <div className="space-y-6">
                    <p className="text-gray-500 font-medium max-w-xs mx-auto sm:mx-0 leading-relaxed">
                        Join the Base ecosystem. Register your .base.eth name and start building the future of the internet.
                    </p>
                    <a href="https://base.org" target="_blank" className="inline-flex items-center gap-2 bg-base-blue text-white px-8 py-4 rounded-full font-bold hover:bg-blue-700 transition-all hover:pr-10">
                        Start Building <ArrowRight size={18} />
                    </a>
                </div>
            </div>
            <span className="absolute bottom-6 left-8 text-6xl font-[900] text-gray-200 -z-0 hidden sm:block">01</span>
        </div>
        <div className="h-full min-h-[350px] relative border-l border-white/20">
            <PixelCanvas />
        </div>
    </div>
);

const App = () => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<{name?: string, avatar?: string} | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{name: string, available: boolean, data?: ProfileData} | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [parentName, setParentName] = useState("");
  const [subLabel, setSubLabel] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const subnameRef = useRef<HTMLElement>(null);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install a Web3 wallet like Coinbase Wallet");
    try {
      const p = new BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const net = await p.getNetwork();
      const accounts = await p.send("eth_requestAccounts", []);
      
      setProvider(p);
      setSigner(s);
      setAddress(accounts[0]);
      setChainId(Number(net.chainId));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = (hexChainId: string) => setChainId(parseInt(hexChainId, 16));
      const handleAccountsChanged = (accounts: string[]) => setAddress(accounts[0] || null);
      
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      window.ethereum.request({ method: 'eth_chainId' }).then((hex: string) => setChainId(parseInt(hex, 16)));
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => setAddress(accounts[0] || null));

      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const activeProvider = new JsonRpcProvider(BASE_RPC_URL);
      if (address) {
        try {
          const name = await activeProvider.lookupAddress(address);
          if (name && (name.toLowerCase().endsWith('.base.eth') || name.toLowerCase().endsWith('.eth'))) {
            setParentName(name);
            const node = ethers.namehash(name);
            const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, activeProvider);
            const resolverAddr = await registry.resolver(node).catch(() => RESOLVER_ADDRESS);
            
            let avatar = "";
            if (resolverAddr !== ethers.ZeroAddress) {
              const resolver = new Contract(resolverAddr, RESOLVER_ABI, activeProvider);
              const avatarRecord = await resolver.text(node, "avatar").catch(() => "");
              avatar = resolveAvatarUrl(name, avatarRecord);
            }
            setUserProfile({ name, avatar });
          } else {
            setUserProfile(null);
            setParentName("");
          }
        } catch (err) {
          setUserProfile(null);
          setParentName("");
        }
      } else {
        setUserProfile(null);
        setParentName("");
      }
    };
    fetchUserProfile();
  }, [address]);

  const switchToBase = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
    } catch (e: any) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: BASE_CHAIN_ID_HEX,
            chainName: 'Base',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [BASE_RPC_URL],
            blockExplorerUrls: [BASE_EXPLORER],
          }],
        });
      }
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let query = searchTerm.trim().toLowerCase();
    if (!query) return;
    if (!query.includes('.')) query += ".base.eth";
    
    const activeProvider = new JsonRpcProvider(BASE_RPC_URL);
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const node = toNodeHash(query);
      
      // Direct Contract Call to the L2 Resolver to check availability
      const resolver = new Contract(RESOLVER_ADDRESS, RESOLVER_ABI, activeProvider);
      const resolvedAddress = await resolver.addr(node);

      if (!resolvedAddress || resolvedAddress === ethers.ZeroAddress) {
        // Name is Available according to Resolver addr record
        setSearchResult({ name: query, available: true });
      } else {
        // Name is Taken
        const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, activeProvider);
        
        let owner = ethers.ZeroAddress;
        try {
          owner = await registry.owner(node);
        } catch (err) {
          console.debug("Ownership lookup failed on L2 Registry");
        }

        const [avatarRecord, twitter, url] = await Promise.all([
          resolver.text(node, "avatar").catch(() => ""),
          resolver.text(node, "com.twitter").catch(() => ""),
          resolver.text(node, "url").catch(() => "")
        ]);

        const avatar = resolveAvatarUrl(query, avatarRecord);
        const isMine = (address?.toLowerCase() === owner.toLowerCase()) || (address?.toLowerCase() === resolvedAddress.toLowerCase());

        setSearchResult({ 
          name: query, 
          available: false, 
          data: { 
            owner, 
            resolver: RESOLVER_ADDRESS, 
            avatar, 
            twitter, 
            url, 
            address: resolvedAddress,
            isMine 
          } 
        });
      }
    } catch (err) {
      console.error(err);
      setSearchError("Resolution failed. The Base network may be congested. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleMintSubname = async () => {
    if (!signer || !chainId) return;
    setMintStatus(null);
    setIsMinting(true);

    try {
      const cleanParent = parentName.toLowerCase().trim();
      const cleanLabel = subLabel.toLowerCase().trim();
      const cleanTarget = targetAddress.trim();
      
      if (!ethers.isAddress(cleanTarget)) throw new Error("Invalid target address.");

      const parentNode = toNodeHash(cleanParent);
      const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
      
      const owner = await registry.owner(parentNode);
      if (owner.toLowerCase() !== address?.toLowerCase()) {
        throw new Error(`You do not own ${cleanParent}. Subnames can only be minted by the parent owner.`);
      }

      const tx = await registry.setSubnodeOwner(parentNode, ethers.id(cleanLabel), ethers.getAddress(cleanTarget));
      setMintStatus({ type: 'success', msg: `Transaction Submitted: ${tx.hash.slice(0, 20)}...` });
      await tx.wait();
      setMintStatus({ type: 'success', msg: `Successfully minted ${cleanLabel}.${cleanParent}!` });
      setSubLabel("");
    } catch (err: any) {
      setMintStatus({ type: 'error', msg: err.reason || err.message || "Minting failed" });
    } finally {
      setIsMinting(false);
    }
  };

  const isOnBase = chainId === BASE_CHAIN_ID_DECIMAL;

  const scrollToSubname = () => {
    subnameRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (searchResult?.name) setParentName(searchResult.name);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-base-blue selection:text-white pb-20">
      <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BaseLogo />
            <span className="font-bold text-xl tracking-tight">Base Names</span>
          </div>
          <div className="flex items-center gap-3">
            {address && (
              isOnBase ? (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-50 text-base-blue border border-blue-100">
                  <div className="w-2 h-2 rounded-full bg-base-blue"></div>Base
                </div>
              ) : (
                <button onClick={switchToBase} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 animate-pulse">
                  <ShieldAlert size={14} />Switch to Base
                </button>
              )
            )}
            <button onClick={address ? undefined : connectWallet} className={`flex items-center gap-3 rounded-full font-bold transition-all active:scale-95 ${address ? "bg-gray-100 text-black pr-1 pl-4 py-1 border border-gray-200 hover:bg-gray-200" : "bg-black text-white px-6 py-2.5 hover:bg-gray-800 shadow-sm"}`}>
              <span className="text-xs sm:text-sm font-bold">{address ? `${address.slice(0,6)}...${address.slice(-4)}` : "Connect Wallet"}</span>
              {address && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                  {userProfile?.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-base-blue flex items-center justify-center text-white text-[10px]">{address.slice(2,4).toUpperCase()}</div>}
                </div>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-4">
        <section>
          <div className="text-center mb-10">
            <h1 className="text-5xl font-[900] tracking-tighter mb-4">Find your <span className="text-base-blue">Base</span> identity.</h1>
            <p className="text-gray-500 text-lg">Direct resolution for .base.eth names on the Base L2 Network.</p>
          </div>
          <div className="max-w-2xl mx-auto relative mb-12">
            <form onSubmit={handleSearch} className="relative z-10">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search names..." className="w-full h-16 pl-6 pr-16 rounded-2xl border-2 border-transparent shadow-lg shadow-blue-900/5 focus:outline-none focus:border-base-blue/30 text-xl font-medium placeholder:text-gray-300 transition-all" />
              <button type="submit" disabled={isSearching} className="absolute right-2 top-2 h-12 w-12 bg-base-blue hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-70">{isSearching ? <Loader2 className="animate-spin" /> : <Search size={24} />}</button>
            </form>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl blur opacity-50 -z-10"></div>
          </div>

          {searchError && <div className="max-w-2xl mx-auto p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-bottom-2"><AlertCircle size={20} /> {searchError}</div>}

          {searchResult && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              {searchResult.available ? (
                <Card className="flex items-center justify-between bg-green-50/50 border-green-100 border-2 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/30 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="z-10">
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{searchResult.name}</h3>
                    <p className="text-green-600 font-bold flex items-center gap-2"><CheckCircle2 size={18} /> Available to Mint</p>
                  </div>
                  <div className="z-10"><Sparkles className="text-base-blue animate-pulse" size={32} /></div>
                </Card>
              ) : (
                <div className={`bg-white rounded-[2rem] shadow-xl overflow-hidden border ${searchResult.data?.isMine ? 'border-base-blue/50 ring-4 ring-blue-50' : 'border-gray-100'}`}>
                  <div className={`h-32 relative ${searchResult.data?.isMine ? 'bg-gradient-to-r from-base-blue to-blue-400' : 'bg-gradient-to-r from-gray-200 to-gray-300'}`}>
                     <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                     {searchResult.data?.isMine && (
                       <div className="absolute top-4 right-6 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-wider border border-white/30 flex items-center gap-1.5">
                         <User size={12}/> Owned by You
                       </div>
                     )}
                  </div>
                  <div className="px-8 pb-8 relative">
                    <div className="relative -mt-12 mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-white p-1.5 shadow-md inline-block">
                        {searchResult.data?.avatar ? <img src={searchResult.data.avatar} className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-gray-300"><User size={40} /></div>}
                      </div>
                    </div>
                    <div className="mb-8 flex justify-between items-start">
                      <div>
                        <h2 className="text-3xl font-[800] tracking-tight text-gray-900 mb-2">{searchResult.name}</h2>
                        <span className="px-3 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-500 flex items-center gap-1 w-fit"><Wallet size={12}/> {searchResult.data?.address?.slice(0,6)}...{searchResult.data?.address?.slice(-4)}</span>
                      </div>
                      {searchResult.data?.isMine && (
                        <button onClick={scrollToSubname} className="bg-base-blue text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
                          <Settings size={14}/> Manage
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Twitter</span>
                         <div className="flex items-center gap-2 text-gray-900 font-medium"><Twitter size={18} className="text-base-blue"/> {searchResult.data?.twitter || "Not set"}</div>
                       </div>
                       <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Website</span>
                         <div className="flex items-center gap-2 text-gray-900 font-medium overflow-hidden"><Globe size={18} className="text-base-blue flex-shrink-0"/> <span className="truncate">{searchResult.data?.url || "Not set"}</span></div>
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <AdBanner />

        <section ref={subnameRef} className="max-w-4xl mx-auto pt-10 border-t border-gray-200">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
             <div><h2 className="text-3xl font-[800] tracking-tight">Subname Manager</h2><p className="text-gray-500">Issue subnames for a name you own on Base L2.</p></div>
             {!address ? <button onClick={connectWallet} className="bg-base-blue text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-blue-200">Connect to Mint</button> : !isOnBase ? <button onClick={switchToBase} className="bg-red-500 text-white px-6 py-3 rounded-full font-bold">Switch to Base</button> : null}
           </div>
           <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${!address || !isOnBase ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Box size={64}/></div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">1</span> Parent Name</h3>
                  {userProfile?.name && parentName === userProfile.name && <span className="text-[9px] font-black uppercase text-base-blue bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Synced</span>}
                </div>
                <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. myname.base.eth" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-base-blue transition-colors mb-2" />
                <p className="text-xs text-gray-400">Owner check on L2 Registry.</p>
              </Card>
              <Card className="relative md:col-span-2">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">2</span> Configuration</h3>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                   <div className="flex-1 w-full">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subname Label</label>
                     <div className="flex items-center">
                       <input type="text" value={subLabel} onChange={(e) => setSubLabel(e.target.value)} placeholder="label" className="flex-1 bg-gray-50 border border-gray-200 rounded-l-xl px-4 py-3 text-sm font-medium outline-none focus:border-base-blue" />
                       <div className="bg-gray-100 border border-l-0 border-gray-200 px-3 py-3 rounded-r-xl text-gray-500 text-sm">.{parentName || '...'}</div>
                     </div>
                   </div>
                   <div className="flex-[2] w-full">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Target Address</label>
                     <input type="text" value={targetAddress} onChange={(e) => setTargetAddress(e.target.value)} placeholder="0x..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-base-blue" />
                   </div>
                   <button onClick={handleMintSubname} disabled={isMinting || !subLabel || !parentName || !targetAddress} className="h-[46px] px-6 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:bg-gray-200 transition-colors flex items-center gap-2">
                     {isMinting ? <Loader2 className="animate-spin" size={18}/> : <ArrowRight size={18}/>}Mint
                   </button>
                </div>
                {mintStatus && <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 text-sm ${mintStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}><div className="break-all">{mintStatus.msg}</div></div>}
              </Card>
           </div>
        </section>
      </main>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);