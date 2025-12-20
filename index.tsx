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
  Settings,
  ChevronRight,
  RefreshCw,
  History,
  IdCard,
  Layers
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
 * Using lowercase input for getAddress to avoid checksum validation errors with hardcoded strings
 */
const REGISTRY_ADDRESS = ethers.getAddress("0xb94704422c2a1e396835a571837aa5ae53285a95".toLowerCase());
const RESOLVER_ADDRESS = ethers.getAddress("0xC6d566A56A1aFf6508b41f6c90ff131615583BCD".toLowerCase());
const REGISTRAR_ADDRESS = ethers.getAddress("0x4cCbbf09971936369528659d48b1E0D195487B2C".toLowerCase()); // Base Registrar Controller

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

const REGISTRAR_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
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

interface MintedName {
  name: string;
  txHash: string;
  timestamp: number;
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

const PixelSolarSystem = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pSize = 4;
    const centerX = w / 2;
    const centerY = h / 2;

    const COLORS = {
      BG: '#000000',
      SUN: '#FBBF24',
      BLUE: '#0052FF',
      ORANGE: '#F97316',
      GRAY: '#4B5563',
      WHITE: '#FFFFFF',
      GLOW: '#3B82F6'
    };

    const planets = [
      { dist: 60, speed: 0.02, size: 6, color: COLORS.ORANGE, angle: Math.random() * Math.PI * 2 },
      { dist: 100, speed: 0.012, size: 8, color: COLORS.BLUE, angle: Math.random() * Math.PI * 2 },
      { dist: 150, speed: 0.008, size: 10, color: COLORS.GRAY, angle: Math.random() * Math.PI * 2 },
      { dist: 210, speed: 0.005, size: 12, color: COLORS.WHITE, angle: Math.random() * Math.PI * 2 }
    ];

    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() > 0.8 ? pSize : pSize / 2,
      blink: Math.random() * 0.05
    }));

    let time = 0;

    const animate = () => {
      time += 0.01;
      ctx.fillStyle = COLORS.BG;
      ctx.fillRect(0, 0, w, h);

      stars.forEach(s => {
        const opacity = 0.3 + Math.abs(Math.sin(time * 2 + s.blink * 100)) * 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(Math.floor(s.x / pSize) * pSize, Math.floor(s.y / pSize) * pSize, s.size, s.size);
      });

      ctx.fillStyle = COLORS.SUN;
      const sunSize = 32 + Math.sin(time * 3) * 2;
      ctx.fillRect(Math.floor((centerX - sunSize / 2) / pSize) * pSize, Math.floor((centerY - sunSize / 2) / pSize) * pSize, sunSize, sunSize);
      
      planets.forEach((p) => {
        p.angle += p.speed;
        
        const dx = (centerX + Math.cos(p.angle) * p.dist) - mouseRef.current.x;
        const dy = (centerY + Math.sin(p.angle) * p.dist) - mouseRef.current.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        
        if (mouseRef.current.active && distToMouse < 100) {
          p.angle += p.speed * 2 * (1 - distToMouse / 100);
          ctx.fillStyle = COLORS.GLOW;
        } else {
          ctx.fillStyle = p.color;
        }

        const px = centerX + Math.cos(p.angle) * p.dist;
        const py = centerY + Math.sin(p.angle) * p.dist;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, p.dist, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillRect(Math.floor((px - p.size / 2) / pSize) * pSize, Math.floor((py - p.size / 2) / pSize) * pSize, pSize * (p.size / 4), pSize * (p.size / 4));
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  return (
    <div 
        className="w-full h-full min-h-[350px] bg-black relative overflow-hidden group"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
    >
        <canvas ref={canvasRef} width={600} height={600} className="w-full h-full object-cover transition-transform duration-700" style={{ imageRendering: 'pixelated' }} />
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end pointer-events-none">
             <div className="flex items-center gap-1 text-white text-[10px] font-mono opacity-80 bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                L2 Orbit Engine
             </div>
        </div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
    </div>
  );
};

const AdBanner = () => (
    <div className="max-w-5xl mx-auto my-16 rounded-[2.5rem] overflow-hidden bg-[#F4F5F6] grid grid-cols-1 md:grid-cols-2 shadow-sm border border-gray-200 group">
        <div className="p-12 flex flex-col justify-center relative bg-white md:bg-transparent">
            <div className="sm:pl-16 text-center sm:text-left z-10">
                <h2 className="text-6xl sm:text-7xl font-[900] tracking-tighter leading-[0.85] text-black mb-8 group-hover:scale-105 transition-transform duration-500 origin-left selection:bg-black selection:text-white">
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
            <PixelSolarSystem />
        </div>
    </div>
);

const App = () => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<{name?: string, avatar?: string} | null>(null);
  const [rootNameBalance, setRootNameBalance] = useState<number>(0);
  const [recentMints, setRecentMints] = useState<MintedName[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{name: string, available: boolean, data?: ProfileData} | null>(0);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [parentName, setParentName] = useState("");
  const [subLabel, setSubLabel] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<{type: 'success' | 'error', msg: string, txHash?: string} | null>(null);

  const subnameRef = useRef<HTMLElement>(null);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install a Web3 wallet like Coinbase Wallet");
    try {
      const p = new BrowserProvider(window.ethereum);
      const accounts = await p.send("eth_requestAccounts", []);
      const net = await p.getNetwork();
      
      setProvider(p);
      setAddress(accounts[0]);
      setChainId(Number(net.chainId));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIdentityData = async () => {
    if (!address) return;
    setIsRefreshing(true);
    const activeProvider = new JsonRpcProvider(BASE_RPC_URL);
    
    try {
      // 1. Fetch Primary Name (Reverse Resolution)
      const name = await activeProvider.lookupAddress(address);
      if (name && (name.toLowerCase().endsWith('.base.eth') || name.toLowerCase().endsWith('.eth'))) {
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
      }

      // 2. Fetch Root Name Balance
      const registrar = new Contract(REGISTRAR_ADDRESS, REGISTRAR_ABI, activeProvider);
      const balance = await registrar.balanceOf(address);
      setRootNameBalance(Number(balance));

    } catch (err) {
      console.error("Identity fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (address) fetchIdentityData();
  }, [address]);

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
      const resolver = new Contract(RESOLVER_ADDRESS, RESOLVER_ABI, activeProvider);
      const resolvedAddress = await resolver.addr(node);

      if (!resolvedAddress || resolvedAddress === ethers.ZeroAddress) {
        setSearchResult({ name: query, available: true });
      } else {
        const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, activeProvider);
        let owner = await registry.owner(node).catch(() => ethers.ZeroAddress);

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
      setSearchError("Resolution failed. Please check your connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const useMyAddress = () => {
    if (address) setTargetAddress(address);
  };

  const handleMintSubname = async () => {
    if (!window.ethereum) {
        alert('Please install a Web3 wallet.');
        return;
    }

    setMintStatus(null);
    setIsMinting(true);

    try {
      const tempProvider = new ethers.BrowserProvider(window.ethereum);
      const freshSigner = await tempProvider.getSigner();
      const currentNet = await tempProvider.getNetwork();

      if (Number(currentNet.chainId) !== BASE_CHAIN_ID_DECIMAL) {
          throw new Error("Please switch to Base Mainnet.");
      }

      const cleanParent = parentName.toLowerCase().trim();
      const cleanLabel = subLabel.toLowerCase().trim();
      const cleanTarget = targetAddress.trim();
      
      if (!cleanParent || !cleanLabel || !cleanTarget) throw new Error("Missing fields.");
      if (!ethers.isAddress(cleanTarget)) throw new Error("Invalid address.");

      const parentNode = toNodeHash(cleanParent);
      const labelHash = ethers.id(cleanLabel);
      
      const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, freshSigner);
      const owner = await registry.owner(parentNode);
      
      if (owner.toLowerCase() !== address?.toLowerCase()) {
        throw new Error(`You don't own ${cleanParent}.`);
      }

      const tx = await registry.setSubnodeOwner(parentNode, labelHash, ethers.getAddress(cleanTarget));
      
      setMintStatus({ 
        type: 'success', 
        msg: `Minting ${cleanLabel}.${cleanParent}...`,
        txHash: tx.hash
      });

      await tx.wait();
      
      setMintStatus({ 
        type: 'success', 
        msg: `Successfully minted ${cleanLabel}.${cleanParent}!`,
        txHash: tx.hash
      });

      // Update session list and refresh identity
      setRecentMints(prev => [{
        name: `${cleanLabel}.${cleanParent}`,
        txHash: tx.hash,
        timestamp: Date.now()
      }, ...prev]);
      
      fetchIdentityData();
      setSubLabel("");
    } catch (err: any) {
      setMintStatus({ type: 'error', msg: err.reason || err.message || "Minting failed." });
    } finally {
      setIsMinting(false);
    }
  };

  const isOnBase = chainId === BASE_CHAIN_ID_DECIMAL;

  const scrollToSubname = () => {
    if (searchResult?.name) setParentName(searchResult.name);
    subnameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        {/* Search Section */}
        <section>
          <div className="text-center mb-10">
            <h1 className="text-5xl font-[900] tracking-tighter mb-4 selection:bg-base-blue selection:text-white">Find your <span className="text-base-blue">Base</span> identity.</h1>
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
                        <h2 className="text-3xl font-[800] tracking-tight text-gray-900 mb-2 selection:bg-base-blue selection:text-white">{searchResult.name}</h2>
                        <span className="px-3 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-500 flex items-center gap-1 w-fit"><Wallet size={12}/> {searchResult.data?.address?.slice(0,6)}...{searchResult.data?.address?.slice(-4)}</span>
                      </div>
                      {searchResult.data?.isMine && (
                        <button onClick={scrollToSubname} className="bg-base-blue text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 group shadow-lg shadow-blue-200">
                          <Settings size={14} className="group-hover:rotate-90 transition-transform duration-300"/> Manage Subnames
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

        {/* Subname Manager Block */}
        <section ref={subnameRef} className="max-w-4xl mx-auto pt-10 border-t border-gray-200 scroll-mt-24">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
             <div><h2 className="text-3xl font-[800] tracking-tight selection:bg-base-blue selection:text-white">Subname Manager</h2><p className="text-gray-500">Issue subnames for a name you own on Base L2.</p></div>
             {!address ? (
               <button onClick={connectWallet} className="bg-base-blue text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-blue-200">Connect to Mint</button>
             ) : !isOnBase ? (
               <button onClick={switchToBase} className="bg-red-500 text-white px-6 py-3 rounded-full font-bold">Switch to Base</button>
             ) : null}
           </div>
           
           <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${!address || !isOnBase ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              <Card className="relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500"><Box size={64}/></div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">1</span> Parent Name</h3>
                </div>
                <input 
                  type="text" 
                  value={parentName} 
                  onChange={(e) => setParentName(e.target.value)} 
                  placeholder="e.g. myname.base.eth" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-base-blue transition-colors mb-2" 
                />
                <div className="flex items-center justify-between">
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">L2 Registry Domain</p>
                   {userProfile?.name === parentName && <span className="text-[9px] font-black uppercase text-base-blue flex items-center gap-1"><CheckCircle2 size={10}/> Own Verified</span>}
                </div>
              </Card>

              <Card className="relative md:col-span-2 flex flex-col h-full">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">2</span> 
                  Configuration
                </h3>
                
                <div className="flex flex-col gap-6 flex-grow">
                   <div className="w-full">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subname Label</label>
                     <div className="flex items-center">
                       <input 
                         type="text" 
                         value={subLabel} 
                         onChange={(e) => setSubLabel(e.target.value)} 
                         placeholder="label" 
                         className="flex-1 bg-gray-50 border border-gray-200 rounded-l-xl px-4 py-3 text-sm font-medium outline-none focus:border-base-blue" 
                       />
                       <div className="bg-gray-100 border border-l-0 border-gray-200 px-4 py-3 rounded-r-xl text-gray-500 text-sm font-semibold">
                         .{parentName || '...'}
                       </div>
                     </div>
                   </div>
                   
                   <div className="w-full">
                     <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Target Owner Address</label>
                        <button 
                          onClick={useMyAddress} 
                          className="text-[10px] text-base-blue font-black uppercase tracking-widest hover:text-blue-700 transition-colors"
                        >
                          Use my address
                        </button>
                     </div>
                     <input 
                        type="text" 
                        value={targetAddress} 
                        onChange={(e) => setTargetAddress(e.target.value)} 
                        placeholder="0x..." 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-base-blue" 
                      />
                   </div>

                   <div className="flex items-center justify-end mt-2 pt-4 border-t border-gray-50">
                     <button 
                       onClick={handleMintSubname} 
                       disabled={isMinting || !subLabel || !parentName || !targetAddress} 
                       className="h-12 px-10 bg-base-blue text-white rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-300 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95"
                     >
                       {isMinting ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                       {isMinting ? "Minting..." : "Mint Subname"}
                     </button>
                   </div>
                </div>

                {mintStatus && (
                  <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2 ${mintStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {mintStatus.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0"/> : <AlertCircle size={18} className="mt-0.5 flex-shrink-0"/>}
                    <div className="flex-1">
                        <div className="break-all font-medium leading-relaxed">{mintStatus.msg}</div>
                        {mintStatus.txHash && (
                            <a 
                              href={`${BASE_EXPLORER}/tx/${mintStatus.txHash}`} 
                              target="_blank" 
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-base-blue hover:underline"
                            >
                                View on Basescan <ExternalLink size={12}/>
                            </a>
                        )}
                    </div>
                  </div>
                )}
              </Card>
           </div>
        </section>

        {/* Dashboard Section */}
        {address && (
          <section className="max-w-4xl mx-auto pt-12 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="text-gray-400" size={24}/>
                  <h2 className="text-3xl font-[800] tracking-tight selection:bg-base-blue selection:text-white">My Base Identity</h2>
                </div>
                <button 
                  onClick={fetchIdentityData} 
                  disabled={isRefreshing}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 disabled:opacity-50"
                >
                  <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""}/>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Identity Summary */}
                <Card className="flex flex-col gap-6 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 text-gray-50 opacity-10 group-hover:scale-110 transition-transform"><IdCard size={80}/></div>
                   <div>
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Primary Name</span>
                     <div className="flex items-center gap-3">
                       <h3 className="text-2xl font-black text-gray-900 truncate max-w-[200px] selection:bg-black selection:text-white">
                         {userProfile?.name || "No Primary Name"}
                       </h3>
                       {userProfile?.name && (
                         <span className="px-2 py-0.5 bg-base-blue text-white text-[9px] font-black uppercase tracking-wider rounded-md">Primary</span>
                       )}
                     </div>
                   </div>
                   
                   <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-base-blue">
                          <Layers size={20}/>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Root Names</span>
                          <span className="text-xl font-black text-gray-900">{rootNameBalance}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Wallet Address</span>
                        <span className="text-xs font-mono text-gray-500">{address.slice(0,6)}...{address.slice(-4)}</span>
                     </div>
                   </div>
                </Card>

                {/* Session Mint History */}
                <Card className="flex flex-col min-h-[200px]">
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-4">Recent Session Mints</span>
                   <div className="flex-grow space-y-3">
                     {recentMints.length === 0 ? (
                       <div className="flex flex-col items-center justify-center h-full text-gray-300 py-6">
                         <Sparkles size={32} className="mb-2 opacity-50"/>
                         <p className="text-xs font-medium">Mint subnames to see them here.</p>
                       </div>
                     ) : (
                       recentMints.map((mint, i) => (
                         <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100">
                               <Box size={14} className="text-base-blue"/>
                             </div>
                             <span className="text-sm font-bold text-gray-800 selection:bg-black selection:text-white">{mint.name}</span>
                           </div>
                           <a 
                             href={`${BASE_EXPLORER}/tx/${mint.txHash}`} 
                             target="_blank" 
                             className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-base-blue shadow-none hover:shadow-sm"
                           >
                             <ExternalLink size={14}/>
                           </a>
                         </div>
                       ))
                     )}
                   </div>
                </Card>
            </div>
          </section>
        )}

        {/* Build Onchain Ad Block */}
        <AdBanner />
      </main>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);