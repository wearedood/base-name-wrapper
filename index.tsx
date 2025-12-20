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
  Layers,
  Zap
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

const REGISTRY_ADDRESS = ethers.getAddress("0xb94704422c2a1e396835a571837aa5ae53285a95".toLowerCase());
const RESOLVER_ADDRESS = ethers.getAddress("0xC6d566A56A1aFf6508b41f6c90ff131615583BCD".toLowerCase());
const REGISTRAR_ADDRESS = ethers.getAddress("0xedB58850756783A09633D62624B5178619E63B48".toLowerCase()); 

const toNodeHash = (name: string): string => {
  if (!name) return ethers.ZeroHash;
  return ethers.namehash(name.toLowerCase().trim());
};

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

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 450;
    };
    resize();
    window.addEventListener('resize', resize);

    const pSize = 4;
    const COLORS = {
      BG: '#000000',
      SUN: '#FBBF24',
      BLUE: '#0052FF',
      ORANGE: '#F97316',
      PURPLE: '#8B5CF6',
      CYAN: '#22D3EE',
      GRAY: '#4B5563',
      WHITE: '#FFFFFF',
      GLOW: '#3B82F6'
    };

    // More planets as requested
    const planets = [
      { dist: 60, speed: 0.022, size: 6, color: COLORS.ORANGE, angle: Math.random() * Math.PI * 2 },
      { dist: 90, speed: 0.016, size: 8, color: COLORS.CYAN, angle: Math.random() * Math.PI * 2 },
      { dist: 130, speed: 0.011, size: 10, color: COLORS.BLUE, angle: Math.random() * Math.PI * 2 },
      { dist: 175, speed: 0.008, size: 7, color: COLORS.PURPLE, angle: Math.random() * Math.PI * 2 },
      { dist: 220, speed: 0.005, size: 12, color: COLORS.WHITE, angle: Math.random() * Math.PI * 2 },
      { dist: 280, speed: 0.003, size: 9, color: COLORS.GRAY, angle: Math.random() * Math.PI * 2 },
      { dist: 350, speed: 0.002, size: 6, color: COLORS.BLUE, angle: Math.random() * Math.PI * 2 },
    ];

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * 3000,
      y: Math.random() * 3000,
      size: Math.random() > 0.8 ? pSize : pSize / 2,
      blink: Math.random() * 0.05
    }));

    let time = 0;

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2 + 100; // Offset center slightly for visual balance with text
      const centerY = h / 2;

      time += 0.01;
      ctx.fillStyle = COLORS.BG;
      ctx.fillRect(0, 0, w, h);

      stars.forEach(s => {
        const opacity = 0.15 + Math.abs(Math.sin(time * 2 + s.blink * 100)) * 0.4;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(Math.floor((s.x % w) / pSize) * pSize, Math.floor((s.y % h) / pSize) * pSize, s.size, s.size);
      });

      // Sun Glow
      const grd = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 80);
      grd.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
      grd.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
      ctx.fill();

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
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
    };
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
        className="w-full h-full min-h-[500px] bg-black relative overflow-hidden group"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
    >
        <canvas ref={canvasRef} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105" style={{ imageRendering: 'pixelated' }} />
        {/* Dark overlays for better text contrast */}
        <div className="absolute inset-y-0 left-0 w-full md:w-3/4 bg-gradient-to-r from-black via-black/60 to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
        
        <div className="absolute top-10 right-10 flex flex-col gap-2 items-end pointer-events-none z-10">
             <div className="flex items-center gap-2 text-white/60 text-[9px] font-black uppercase tracking-[0.4em] bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#4ADE80]"></div>
                Network: Base L2
             </div>
        </div>
    </div>
  );
};

const AdBanner = () => (
    <div className="max-w-4xl mx-auto my-16 rounded-[3.5rem] overflow-hidden relative shadow-[0_50px_150px_-30px_rgba(0,82,255,0.25)] border border-white/5 group transition-all duration-700">
        {/* Full-Block Background */}
        <div className="absolute inset-0 z-0">
          <PixelSolarSystem />
        </div>

        {/* Text Content Container */}
        <div className="relative z-10 p-16 md:p-24 flex flex-col justify-center min-h-[500px]">
            <div className="max-w-xl text-center md:text-left relative">
                <div className="inline-block px-5 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-10 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-700">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Onchain Frontier</span>
                </div>
                
                <h2 className="text-7xl md:text-9xl font-[900] tracking-tighter leading-[0.8] text-white mb-10 group-hover:tracking-[-0.03em] transition-all duration-1000 origin-left selection:bg-white selection:text-black">
                    Build<br/>
                    <span className="text-base-blue">Onchain</span>
                </h2>
                
                <div className="space-y-12">
                    <p className="text-white/60 font-medium max-w-sm mx-auto md:mx-0 leading-relaxed text-xl animate-in fade-in slide-in-from-left-6 duration-1000">
                        Join the fastest-growing L2. Secure your <span className="text-white font-black underline decoration-blue-500 underline-offset-8">.base.eth</span> name and start building.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <a 
                        href="https://base.org" 
                        target="_blank" 
                        className="group/btn relative inline-flex items-center gap-4 bg-white text-black px-14 py-6 rounded-[2rem] font-black uppercase tracking-widest text-[12px] hover:bg-base-blue hover:text-white transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_25px_60px_-5px_rgba(0,82,255,0.6)] active:scale-95 overflow-hidden"
                      >
                          <span className="relative z-10 flex items-center gap-2">
                            Enter the Orbit <ArrowRight size={22} className="group-hover/btn:translate-x-2 transition-transform duration-300" />
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                      </a>
                    </div>
                </div>
            </div>
            
            {/* Massive Background Design Watermark */}
            <span className="absolute bottom-10 right-16 text-[18rem] font-black text-white/[0.03] -z-10 select-none leading-none pointer-events-none italic tracking-tighter">01</span>
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
  const [searchResult, setSearchResult] = useState<{name: string, available: boolean, data?: ProfileData} | null>(null);
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
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-base-blue selection:text-white pb-20 overflow-x-hidden">
      <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex justify-between items-center">
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

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-4">
        <section className="pt-8 pb-12">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-base-blue text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-blue-100">
              <Zap size={12} className="fill-current"/> New: ENS on Base
            </div>
            <h1 className="text-6xl md:text-7xl font-[900] tracking-tighter mb-6 selection:bg-base-blue selection:text-white leading-[0.9]">
              Secure your <br/><span className="text-base-blue">Digital Identity.</span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              Register, manage, and resolve .base.eth names natively on L2.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto relative group">
            <form 
              onSubmit={handleSearch} 
              className="relative z-20 flex items-center bg-white p-2 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,82,255,0.12)] border border-gray-100 group-hover:shadow-[0_25px_70px_-10px_rgba(0,82,255,0.2)] transition-all duration-500 ease-out"
            >
              <div className="pl-6 text-gray-400">
                <Search size={24} strokeWidth={2.5}/>
              </div>
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Search names (e.g. coffee.base.eth)" 
                className="w-full h-16 pl-4 pr-4 bg-transparent focus:outline-none text-xl md:text-2xl font-bold placeholder:text-gray-200 placeholder:font-medium selection:bg-blue-100" 
              />
              <button 
                type="submit" 
                disabled={isSearching} 
                className="h-16 px-10 bg-base-blue hover:bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm flex items-center justify-center transition-all disabled:opacity-70 active:scale-95 shadow-lg shadow-blue-500/20"
              >
                {isSearching ? <Loader2 className="animate-spin" size={20}/> : "Search"}
              </button>
            </form>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10"></div>
          </div>

          {searchError && (
            <div className="max-w-2xl mx-auto mt-8 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 border border-red-100 font-bold">
              <AlertCircle size={20} /> {searchError}
            </div>
          )}

          {searchResult && (
            <div className="max-w-4xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {searchResult.available ? (
                <Card className="flex items-center justify-between bg-green-50/50 border-green-100 border-2 overflow-hidden relative p-10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-green-200/20 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                  <div className="z-10">
                    <h3 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">{searchResult.name}</h3>
                    <p className="text-green-600 font-black flex items-center gap-2 text-lg uppercase tracking-widest"><CheckCircle2 size={24} /> Available to Mint</p>
                  </div>
                  <div className="z-10 p-6 bg-white rounded-3xl shadow-xl shadow-green-900/5"><Sparkles className="text-base-blue animate-pulse" size={48} /></div>
                </Card>
              ) : (
                <div className={`bg-white rounded-[3rem] shadow-2xl overflow-hidden border ${searchResult.data?.isMine ? 'border-base-blue/50 ring-[12px] ring-blue-50' : 'border-gray-100'}`}>
                  <div className={`h-48 relative ${searchResult.data?.isMine ? 'bg-gradient-to-r from-base-blue via-blue-500 to-indigo-500' : 'bg-gradient-to-r from-gray-200 to-gray-300'}`}>
                     <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
                     {searchResult.data?.isMine && (
                       <div className="absolute top-6 right-8 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-[0.2em] border border-white/30 flex items-center gap-2">
                         <User size={14}/> Primary Identity
                       </div>
                     )}
                  </div>
                  <div className="px-12 pb-12 relative">
                    <div className="relative -mt-16 mb-8 flex justify-between items-end">
                      <div className="w-32 h-32 rounded-[2.5rem] bg-white p-2 shadow-2xl inline-block border border-gray-100">
                        {searchResult.data?.avatar ? <img src={searchResult.data.avatar} className="w-full h-full object-cover rounded-[2rem]" /> : <div className="w-full h-full bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200"><User size={56} /></div>}
                      </div>
                      {searchResult.data?.isMine && (
                        <button onClick={scrollToSubname} className="bg-base-blue text-white h-12 px-6 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-3 group shadow-xl shadow-blue-500/30 active:scale-95 mb-2">
                          <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500"/> Manage Subnames
                        </button>
                      )}
                    </div>
                    <div className="mb-10">
                      <h2 className="text-5xl font-black tracking-tighter text-gray-900 mb-4 selection:bg-base-blue selection:text-white">{searchResult.name}</h2>
                      <div className="flex items-center gap-4">
                        <span className="px-4 py-2 bg-gray-50 rounded-xl text-xs font-mono font-bold text-gray-500 flex items-center gap-2 border border-gray-100"><Wallet size={14} className="text-base-blue"/> {searchResult.data?.address}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section ref={subnameRef} className="max-w-4xl mx-auto pt-16 border-t border-gray-200 scroll-mt-24">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
             <div>
               <h2 className="text-4xl font-[900] tracking-tight">Subname Manager</h2>
               <p className="text-gray-400 font-medium">Instantly provision L2 subnames for domains you own.</p>
             </div>
           </div>
           
           <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${!address || !isOnBase ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              <Card className="relative overflow-hidden group p-8">
                <input 
                  type="text" 
                  value={parentName} 
                  onChange={(e) => setParentName(e.target.value)} 
                  placeholder="e.g. coffee.base.eth" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:border-base-blue focus:bg-white focus:shadow-inner transition-all mb-4" 
                />
              </Card>

              <Card className="relative md:col-span-2 flex flex-col h-full p-8">
                <div className="flex flex-col gap-8 flex-grow">
                   <div className="w-full">
                     <div className="flex items-center group/input">
                       <input 
                         type="text" 
                         value={subLabel} 
                         onChange={(e) => setSubLabel(e.target.value)} 
                         placeholder="e.g. brew" 
                         className="flex-1 bg-gray-50 border border-gray-100 rounded-l-2xl px-5 py-4 text-lg font-bold outline-none focus:border-base-blue focus:bg-white transition-all" 
                       />
                       <div className="bg-gray-100 border border-l-0 border-gray-100 px-6 py-4 rounded-r-2xl text-gray-400 text-sm font-black uppercase tracking-widest">
                         .{parentName || 'base.eth'}
                       </div>
                     </div>
                   </div>
                   
                   <div className="w-full">
                     <input 
                        type="text" 
                        value={targetAddress} 
                        onChange={(e) => setTargetAddress(e.target.value)} 
                        placeholder="0x..." 
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-mono font-bold outline-none focus:border-base-blue focus:bg-white transition-all" 
                      />
                   </div>

                   <div className="flex items-center justify-end mt-4 pt-6 border-t border-gray-50">
                     <button 
                       onClick={handleMintSubname} 
                       disabled={isMinting || !subLabel || !parentName || !targetAddress} 
                       className="h-14 px-12 bg-base-blue text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 disabled:bg-gray-50 disabled:text-gray-200 transition-all flex items-center gap-3 shadow-2xl shadow-blue-500/20 active:scale-95"
                     >
                       {isMinting ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                       {isMinting ? "Processing..." : "Issue Subname"}
                     </button>
                   </div>
                </div>
              </Card>
           </div>
        </section>

        {address && (
          <section className="max-w-4xl mx-auto pt-20 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                    <History size={24}/>
                  </div>
                  <div>
                    <h2 className="text-4xl font-[900] tracking-tight">My Base Profile</h2>
                  </div>
                </div>
                <button 
                  onClick={fetchIdentityData} 
                  disabled={isRefreshing}
                  className="w-12 h-12 flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-100 rounded-full transition-all text-gray-400 hover:text-base-blue shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={24} className={isRefreshing ? "animate-spin" : ""}/>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="flex flex-col gap-8 relative overflow-hidden group p-10">
                   <div className="absolute top-0 right-0 p-8 text-gray-50 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none -mr-4 -mt-4"><IdCard size={180}/></div>
                   <div className="relative z-10">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] block mb-3">Primary Resolution</span>
                     <div className="flex items-center gap-4 flex-wrap">
                       <h3 className={`text-3xl font-black tracking-tight ${userProfile?.name ? 'text-gray-900' : 'text-gray-300'} truncate max-w-full`}>
                         {userProfile?.name || "Unidentified Wallet"}
                       </h3>
                     </div>
                   </div>
                   
                   <div className="flex items-center justify-between pt-8 border-t border-gray-100 relative z-10">
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-3xl bg-blue-50 flex items-center justify-center text-base-blue border border-blue-100/30">
                          <Layers size={28}/>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1">Portfolio</span>
                          <span className="text-3xl font-black text-gray-900 leading-none">{rootNameBalance} Names</span>
                        </div>
                     </div>
                   </div>
                </Card>

                <Card className="flex flex-col min-h-[300px] p-10">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] block mb-8">Session Activity Log</span>
                   <div className="flex-grow space-y-4">
                     {recentMints.length === 0 ? (
                       <div className="flex flex-col items-center justify-center h-full text-gray-300 py-10 text-center">
                         <div className="w-20 h-20 rounded-[2rem] bg-gray-50 flex items-center justify-center mb-6 shadow-inner border border-gray-100/50">
                            <Sparkles size={40} className="opacity-30 text-base-blue"/>
                         </div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Activity Empty</p>
                       </div>
                     ) : (
                       recentMints.map((mint, i) => (
                         <div key={i} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 group hover:border-blue-200 hover:bg-white transition-all duration-300">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
                               <Box size={22} className="text-base-blue"/>
                             </div>
                             <div className="flex flex-col">
                                <span className="text-lg font-black text-gray-900 leading-tight">{mint.name}</span>
                             </div>
                           </div>
                           <a 
                             href={`${BASE_EXPLORER}/tx/${mint.txHash}`} 
                             target="_blank" 
                             className="w-12 h-12 flex items-center justify-center bg-transparent hover:bg-gray-100 rounded-2xl transition-all text-gray-300 hover:text-base-blue"
                           >
                             <ExternalLink size={20}/>
                           </a>
                         </div>
                       ))
                     )}
                   </div>
                </Card>
            </div>
          </section>
        )}

        <AdBanner />
      </main>
      
      <footer className="max-w-4xl mx-auto px-6 py-20 border-t border-gray-100 text-center">
         <div className="flex flex-col items-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-1000">
            <BaseLogo />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Powered by Base L2 & ENS</p>
         </div>
      </footer>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);