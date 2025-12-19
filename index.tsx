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
  ExternalLink
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

// Official Base ENS Contracts - Wrapped in getAddress with lowercase input to avoid checksum errors
// By providing lowercase, ethers will calculate and return the correct checksummed address format.
const REGISTRY_ADDRESS = ethers.getAddress("0x03c4738ee95ad7b091c01037cf66fd6217a213b2");
const RESOLVER_ADDRESS = ethers.getAddress("0xc6d566a56a1aff6508b41f6c90ff131615583bcd"); 

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

// --- PIXEL ART COMPONENTS ---

const PixelCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Config
    const w = canvas.width;
    const h = canvas.height;
    const pSize = 4; // Size of "pixel"
    const cols = Math.ceil(w / pSize);
    const rows = Math.ceil(h / pSize);

    // Palette
    const C_BG = '#000000';
    const C_BLUE = '#0052FF';
    const C_ORANGE = '#F97316'; // Tailwind Orange-500
    const C_DARK_BLUE = '#172554';

    // Clear
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, w, h);

    // Procedural Terrain Generation
    const terrain = new Float32Array(cols);
    let yOff = rows * 0.7; // Start lower down
    
    for(let i = 0; i < cols; i++) {
        const jaggedness = (Math.random() - 0.5) * 8; 
        const slope = (Math.random() - 0.5) * 2; 
        
        yOff += jaggedness + slope;
        
        if(yOff < rows * 0.2) yOff = rows * 0.2 + 2; 
        if(yOff > rows * 0.9) yOff = rows * 0.9 - 2;
        
        terrain[i] = yOff;
    }

    // Draw Terrain
    for(let i = 0; i < cols; i++) {
        const ceiling = terrain[i];
        for(let j = 0; j < rows; j++) {
            if (j > ceiling) {
                const depth = j - ceiling;
                const noise = Math.random();
                
                if (depth < 2 && noise > 0.3) {
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
    
    // Add "Glitch" stars/particles
    for(let k = 0; k < 80; k++) {
        const rx = Math.floor(Math.random() * cols);
        const ry = Math.floor(Math.random() * (rows * 0.6));
        if (ry < terrain[rx]) {
             ctx.fillStyle = Math.random() > 0.5 ? C_BLUE : C_ORANGE;
             const starSize = Math.random() > 0.8 ? pSize * 2 : pSize;
             ctx.fillRect(rx * pSize, ry * pSize, starSize, starSize);
        }
    }
  }, []);

  return (
    <div className="w-full h-full min-h-[300px] bg-black relative overflow-hidden">
        <canvas 
            ref={canvasRef} 
            width={600} 
            height={600} 
            className="w-full h-full object-cover" 
            style={{ imageRendering: 'pixelated' }}
        />
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
             <div className="flex items-center gap-1 text-white text-[10px] font-mono opacity-80 bg-black/50 px-2 py-1 rounded">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                1.46 Mwei
             </div>
        </div>
        <div className="absolute bottom-4 right-4 text-white text-[10px] font-mono opacity-50 rotate-90 origin-bottom-right translate-x-full whitespace-nowrap">
            coinbase ■ base
        </div>
    </div>
  );
};

const AdBanner = () => (
    <div className="max-w-5xl mx-auto my-16 rounded-[2.5rem] overflow-hidden bg-[#F4F5F6] grid grid-cols-1 md:grid-cols-2 shadow-sm border border-gray-200 group">
        <div className="p-12 flex flex-col justify-center relative">
            <div className="absolute top-0 bottom-0 left-8 hidden sm:flex flex-col justify-between py-12 text-blue-600 font-mono text-xs font-bold tracking-[0.3em] uppercase opacity-60 select-none pointer-events-none">
                <span className="rotate-180" style={{writingMode: 'vertical-rl'}}>Request</span>
                <span className="rotate-180" style={{writingMode: 'vertical-rl'}}>For</span>
                <span className="rotate-180" style={{writingMode: 'vertical-rl'}}>Startups</span>
            </div>
            <div className="sm:pl-16 text-center sm:text-left z-10">
                <h2 className="text-6xl sm:text-7xl font-[900] tracking-tighter leading-[0.85] text-black mb-8 group-hover:scale-105 transition-transform duration-500 origin-left">
                    Build<br/>
                    Onchain
                </h2>
                <div className="space-y-6">
                    <p className="text-gray-500 font-medium max-w-xs mx-auto sm:mx-0 leading-relaxed">
                        In collaboration with Base and Coinbase Ventures, Y Combinator just announced Request for Startups: Fintech 3.0.
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

// --- MAIN APP ---

const App = () => {
  // --- State ---
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{name: string, available: boolean, data?: ProfileData} | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Mint State
  const [parentName, setParentName] = useState("");
  const [subLabel, setSubLabel] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  // --- Wallet & Network ---

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install Coinbase Wallet");
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

  // --- Reverse Resolution ---
  useEffect(() => {
    const performReverseResolution = async () => {
      // Prioritize the connected provider, otherwise use the fixed Base RPC
      const activeProvider = provider || new JsonRpcProvider(BASE_RPC_URL);
      if (address) {
        try {
          // ENS standard lookupAddress
          const name = await activeProvider.lookupAddress(address);
          if (name && name.toLowerCase().endsWith('.base.eth')) {
            setParentName(name);
          }
        } catch (err) {
          console.debug("Reverse lookup failed:", err);
        }
      }
    };
    performReverseResolution();
  }, [address, provider]);

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

  // --- Core Logic ---

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchTerm.trim().toLowerCase();
    if (!query.includes('.')) return setSearchError("Please enter a valid name (e.g. jesse.base.eth)");
    
    // Explicitly use the Base Mainnet RPC
    const readProvider = provider || new JsonRpcProvider(BASE_RPC_URL);
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const node = ethers.namehash(query);
      
      // Use Registry Contract
      const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, readProvider);
      const owner = await registry.owner(node);

      if (owner === ethers.ZeroAddress) {
        setSearchResult({ name: query, available: true });
      } else {
        // Name is taken, fetch profile
        let resolverAddr = await registry.resolver(node);
        
        // Fallback: If registry doesn't return a resolver, try the standard Base Resolver address
        if (resolverAddr === ethers.ZeroAddress) {
            resolverAddr = RESOLVER_ADDRESS;
        }

        let profile: ProfileData = { owner, resolver: resolverAddr };

        try {
            const resolver = new Contract(resolverAddr, RESOLVER_ABI, readProvider);
            
            // Parallel fetch for speed
            const [avatar, twitter, url, addr] = await Promise.all([
                resolver.text(node, "avatar").catch(() => ""),
                resolver.text(node, "com.twitter").catch(() => ""),
                resolver.text(node, "url").catch(() => ""),
                resolver.addr(node).catch(() => "")
            ]);

            profile = { ...profile, avatar, twitter, url, address: addr };
        } catch (resolverErr) {
            console.warn("Could not query resolver details, showing basic info.", resolverErr);
        }
        
        setSearchResult({ name: query, available: false, data: profile });
      }
    } catch (err) {
      console.error(err);
      setSearchError("Failed to resolve name. Check your connection or the name format.");
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
      
      if (!ethers.isAddress(cleanTarget)) {
        throw new Error("Invalid target address provided.");
      }

      const fullSubname = `${cleanLabel}.${cleanParent}`;

      // 1. Check ownership of parent
      const parentNode = ethers.namehash(cleanParent);
      const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
      const owner = await registry.owner(parentNode);

      if (owner.toLowerCase() !== address?.toLowerCase()) {
        throw new Error(`You do not own ${cleanParent}. Ensure the parent name in Step 1 is correct and owned by you.`);
      }

      // 2. Prepare Transaction
      const labelHash = ethers.id(cleanLabel);
      
      const tx = await registry.setSubnodeOwner(parentNode, labelHash, ethers.getAddress(cleanTarget));
      setMintStatus({ type: 'success', msg: `Minting ${fullSubname}... Tx: ${tx.hash}` });
      
      await tx.wait();
      setMintStatus({ type: 'success', msg: `Successfully minted ${fullSubname}!` });
      setSubLabel("");
      
    } catch (err: any) {
      console.error(err);
      setMintStatus({ type: 'error', msg: err.message || "Minting failed" });
    } finally {
      setIsMinting(false);
    }
  };

  const isOnBase = chainId === BASE_CHAIN_ID_DECIMAL;

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-base-blue selection:text-white pb-20">
      
      {/* Header */}
      <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BaseLogo />
            <span className="font-bold text-xl tracking-tight">Base Names</span>
          </div>
          
          <div className="flex items-center gap-4">
            {address && (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${isOnBase ? 'bg-blue-50 text-base-blue' : 'bg-red-50 text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full ${isOnBase ? 'bg-base-blue' : 'bg-red-600'}`}></div>
                {isOnBase ? 'Base' : 'Wrong Net'}
              </div>
            )}
            <button 
              onClick={address ? undefined : connectWallet}
              className="bg-black text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-all active:scale-95"
            >
              {address ? `${address.slice(0,6)}...${address.slice(-4)}` : "Connect Wallet"}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-4">

        {/* --- SECTION 1: SEARCH --- */}
        <section>
          <div className="text-center mb-10">
            <h1 className="text-5xl font-[900] tracking-tighter mb-4">
              Find your <span className="text-base-blue">Base</span> identity.
            </h1>
            <p className="text-gray-500 text-lg">
              Search for .base.eth names, view profiles, and check availability.
            </p>
          </div>

          <div className="max-w-2xl mx-auto relative mb-12">
            <form onSubmit={handleSearch} className="relative z-10">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="search-name.base.eth"
                className="w-full h-16 pl-6 pr-16 rounded-2xl border-2 border-transparent shadow-lg shadow-blue-900/5 focus:outline-none focus:border-base-blue/30 text-xl font-medium placeholder:text-gray-300 transition-all"
              />
              <button 
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-2 h-12 w-12 bg-base-blue hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-70"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : <Search size={24} />}
              </button>
            </form>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl blur opacity-50 -z-10"></div>
          </div>

          {searchError && (
             <div className="max-w-2xl mx-auto p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-bottom-2">
               <AlertCircle size={20} /> {searchError}
             </div>
          )}

          {searchResult && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              {searchResult.available ? (
                <Card className="flex items-center justify-between bg-green-50/50 border-green-100">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{searchResult.name}</h3>
                    <p className="text-green-600 font-medium flex items-center gap-2">
                      <CheckCircle2 size={18} /> Available / Unclaimed
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 font-medium block max-w-[200px]">
                      Note: Top-level .base.eth names are managed by Coinbase.
                    </span>
                  </div>
                </Card>
              ) : (
                <div className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 overflow-hidden border border-gray-100">
                  <div className="h-32 bg-gradient-to-r from-base-blue to-blue-600 relative">
                     <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                  </div>
                  
                  <div className="px-8 pb-8">
                    <div className="relative -mt-12 mb-6">
                      <div className="w-24 h-24 rounded-2xl bg-white p-1.5 shadow-md inline-block">
                        {searchResult.data?.avatar ? (
                          <img src={searchResult.data.avatar} alt="Avatar" className="w-full h-full object-cover rounded-xl bg-gray-100" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-gray-300">
                            <User size={40} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-8">
                      <h2 className="text-3xl font-[800] tracking-tight text-gray-900 mb-2">{searchResult.name}</h2>
                      <div className="flex flex-wrap gap-3">
                        {searchResult.data?.address && (
                          <span className="px-3 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-500 flex items-center gap-1">
                             <Wallet size={12}/> {searchResult.data.address.slice(0,6)}...{searchResult.data.address.slice(-4)}
                          </span>
                        )}
                         <span className="px-3 py-1 bg-blue-50 text-base-blue rounded-md text-xs font-bold uppercase">
                           Registered
                         </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Twitter / X</span>
                         <div className="flex items-center gap-2 text-gray-900 font-medium">
                           <Twitter size={18} className="text-base-blue"/> 
                           {searchResult.data?.twitter || <span className="text-gray-400 italic font-normal">Not set</span>}
                         </div>
                       </div>
                       <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Website</span>
                         <div className="flex items-center gap-2 text-gray-900 font-medium overflow-hidden">
                           <Globe size={18} className="text-base-blue flex-shrink-0"/> 
                           <a href={searchResult.data?.url?.startsWith('http') ? searchResult.data.url : `https://${searchResult.data?.url}`} target="_blank" className="truncate hover:underline">{searchResult.data?.url || <span className="text-gray-400 italic font-normal">Not set</span>}</a>
                         </div>
                       </div>
                       <div className="col-span-1 md:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Owner Address</span>
                         <span className="font-mono text-sm text-gray-600 break-all">{searchResult.data?.owner}</span>
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* --- PIXEL ART AD SECTION --- */}
        <AdBanner />

        {/* --- SECTION 2: SUBNAME MINTING --- */}
        <section className="max-w-4xl mx-auto pt-10 border-t border-gray-200">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
             <div>
               <h2 className="text-3xl font-[800] tracking-tight">Subname Manager</h2>
               <p className="text-gray-500">Issue subnames for a name you own (e.g. mint <span className="font-mono text-black bg-gray-100 px-1 rounded">bob.myname.base.eth</span>).</p>
             </div>
             {!address ? (
               <button onClick={connectWallet} className="bg-base-blue text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-blue-200">
                 Connect to Mint
               </button>
             ) : !isOnBase ? (
               <button onClick={switchToBase} className="bg-red-500 text-white px-6 py-3 rounded-full font-bold">
                 Switch to Base
               </button>
             ) : null}
           </div>

           <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${!address || !isOnBase ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              {/* Step 1: Parent */}
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Box size={64}/></div>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">1</span> Parent Name</h3>
                <input 
                  type="text" 
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="e.g. my-org.base.eth"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-base-blue transition-colors mb-2"
                />
                <p className="text-xs text-gray-400">Must be owned by connected wallet.</p>
              </Card>

              {/* Step 2: Details */}
              <Card className="relative md:col-span-2">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">2</span> Configuration</h3>
                
                <div className="flex flex-col md:flex-row gap-4 items-end">
                   <div className="flex-1 w-full">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Label</label>
                     <div className="flex items-center">
                       <input 
                          type="text" 
                          value={subLabel}
                          onChange={(e) => setSubLabel(e.target.value)}
                          placeholder="subname"
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-l-xl px-4 py-3 text-sm font-medium outline-none focus:border-base-blue"
                        />
                        <div className="bg-gray-100 border border-l-0 border-gray-200 px-3 py-3 rounded-r-xl text-gray-500 text-sm">
                          .{parentName || '...'}
                        </div>
                     </div>
                   </div>
                   
                   <div className="flex-[2] w-full">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Target Owner Address</label>
                     <input 
                        type="text" 
                        value={targetAddress}
                        onChange={(e) => setTargetAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-base-blue"
                      />
                   </div>

                   <button 
                     onClick={handleMintSubname}
                     disabled={isMinting || !subLabel || !parentName || !targetAddress}
                     className="h-[46px] px-6 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex items-center gap-2"
                   >
                     {isMinting ? <Loader2 className="animate-spin" size={18}/> : <ArrowRight size={18}/>}
                     Mint
                   </button>
                </div>

                {mintStatus && (
                  <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 text-sm ${mintStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {mintStatus.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5"/> : <AlertCircle size={18} className="mt-0.5"/>}
                    <div className="break-all">{mintStatus.msg}</div>
                  </div>
                )}
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