import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { ethers, BrowserProvider, Contract } from "ethers";
import { 
  ArrowRight, 
  Copy, 
  Check, 
  Terminal, 
  Code2, 
  Zap, 
  ExternalLink,
  Loader2,
  AlertCircle
} from "lucide-react";

// Fix for: Property 'ethereum' does not exist on type 'Window & typeof globalThis'
declare global {
  interface Window {
    ethereum: any;
  }
}

// --- Configuration ---
const BASE_CHAIN_ID_HEX = "0x2105"; // 8453
const BASE_CHAIN_ID_DECIMAL = 8453;
const BASE_EXPLORER = "https://basescan.org";
// Default to a known deployed instance if available, otherwise empty to encourage deployment
const DEFAULT_CONTRACT_ADDRESS = ""; 

// --- Solidity Contract Asset ---
const SOLIDITY_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HelloBase {
    string public greeting;
    
    event GreetingChanged(address indexed setter, string newGreeting);

    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
        emit GreetingChanged(msg.sender, _greeting);
    }
}`;

const CONTRACT_ABI = [
  "function greeting() view returns (string)",
  "function setGreeting(string _greeting) public",
  "event GreetingChanged(address indexed setter, string newGreeting)"
];

// --- Components ---

const BaseLogo = () => (
  <div className="w-8 h-8 bg-base-blue rounded-lg relative overflow-hidden group hover:scale-105 transition-transform duration-300">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity"></div>
  </div>
);

const VisualBars = () => {
  // Generate a random-looking but static set of heights for the "Base Build" visual
  const bars = [20, 45, 30, 60, 40, 75, 50, 80, 55, 90, 60, 100, 60, 90, 55, 80, 50, 75, 40, 60, 30, 45, 20];
  
  return (
    <div className="flex items-end gap-[4px] h-32 lg:h-48 opacity-20 lg:opacity-100">
      {bars.map((height, i) => (
        <div 
          key={i} 
          className="w-2 lg:w-3 bg-base-blue rounded-full origin-bottom"
          style={{ 
            height: `${height}%`,
            opacity: i % 2 === 0 ? 1 : 0.6,
            animation: `grow 2s infinite ease-in-out ${i * 0.1}s` 
          }}
        ></div>
      ))}
    </div>
  );
};

const Card = ({ children, title, icon: Icon, className = "" }: { children?: React.ReactNode, title?: string, icon?: any, className?: string }) => (
  <div className={`bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
    {title && (
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-2 rounded-full bg-base-blue"></div>
        <h3 className="font-bold text-xl tracking-tight flex items-center gap-2">
          {Icon && <Icon size={20} className="text-gray-400" />}
          {title}
        </h3>
      </div>
    )}
    {children}
  </div>
);

const App = () => {
  // State
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_CONTRACT_ADDRESS);
  const [currentGreeting, setCurrentGreeting] = useState<string>("");
  const [newGreetingInput, setNewGreetingInput] = useState<string>("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // --- Wallet & Network Functions ---

  const connectWallet = async () => {
    setError(null);
    if (!window.ethereum) {
      alert("Please install Coinbase Wallet or MetaMask");
      return;
    }

    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const _signer = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(_signer);
      setAddress(accounts[0]);
      setChainId(Number(network.chainId));

      // Listen for changes
      window.ethereum.on('accountsChanged', (accs: string[]) => {
        if (accs.length > 0) setAddress(accs[0]);
        else {
          setAddress(null);
          setSigner(null);
        }
      });
      
      window.ethereum.on('chainChanged', (newChainId: string) => {
        setChainId(parseInt(newChainId, 16));
        window.location.reload();
      });

    } catch (err: any) {
      console.error(err);
    }
  };

  const switchToBase = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID_HEX,
              chainName: 'Base',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        } catch (addError) {
          setError("Failed to add Base network.");
        }
      }
    }
  };

  // --- Contract Functions ---

  const fetchGreeting = useCallback(async () => {
    if (!provider || !contractAddress || !ethers.isAddress(contractAddress)) return;
    setIsLoading(true);
    try {
      const contract = new Contract(contractAddress, CONTRACT_ABI, provider);
      const _greeting = await contract.greeting();
      setCurrentGreeting(_greeting);
    } catch (err) {
      console.error(err);
      setCurrentGreeting(""); 
    } finally {
      setIsLoading(false);
    }
  }, [provider, contractAddress]);

  const updateGreeting = async () => {
    if (!signer || !contractAddress) return;
    setTxHash(null);
    setIsWriting(true);
    try {
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);
      const tx = await contract.setGreeting(newGreetingInput);
      await tx.wait();
      setTxHash(tx.hash);
      setNewGreetingInput("");
      fetchGreeting();
    } catch (err: any) {
      console.error(err);
      setError(err.reason || "Transaction failed");
    } finally {
      setIsWriting(false);
    }
  };

  useEffect(() => {
    if (chainId === BASE_CHAIN_ID_DECIMAL && contractAddress && ethers.isAddress(contractAddress)) {
      fetchGreeting();
    }
  }, [chainId, contractAddress, fetchGreeting]);

  const copyCode = () => {
    navigator.clipboard.writeText(SOLIDITY_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOnBase = chainId === BASE_CHAIN_ID_DECIMAL;

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-base-blue selection:text-white flex flex-col">
      
      {/* Navigation */}
      <nav className="w-full px-6 py-6 flex justify-between items-center max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2">
          <BaseLogo />
          <span className="font-bold text-xl tracking-tight hidden sm:block">Base Build</span>
        </div>
        
        <div className="flex items-center gap-4">
          {address && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isOnBase ? 'bg-blue-50 text-base-blue' : 'bg-red-50 text-red-600'}`}>
              <div className={`w-2 h-2 rounded-full ${isOnBase ? 'bg-base-blue' : 'bg-red-600'}`}></div>
              {isOnBase ? 'Base Mainnet' : 'Wrong Network'}
            </div>
          )}
          <button 
            onClick={connectWallet}
            className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-full font-bold text-sm transition-all active:scale-95"
          >
            {address ? `${address.slice(0,6)}...${address.slice(-4)}` : "Sign In"}
          </button>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-[1400px] mx-auto px-6 py-8 lg:py-16">
        
        {!address ? (
          /* --- HERO / LANDING STATE --- */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col gap-8">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-4 h-4 bg-base-blue animate-pulse"></div>
                  <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-base-blue">Start Here</span>
                </div>
                <h1 className="text-7xl sm:text-8xl lg:text-[7rem] font-[900] tracking-tighter leading-[0.9] text-black mb-6">
                  Build<br />Onchain
                </h1>
                <p className="text-xl text-gray-500 max-w-md font-medium leading-relaxed">
                  Join the global economy. Deploy smart contracts, build apps, and earn onchain with Base.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={connectWallet}
                  className="bg-base-blue hover:bg-blue-600 text-white text-lg font-bold py-4 px-8 rounded-full transition-transform active:scale-95 flex items-center gap-2"
                >
                  Start Building <ArrowRight size={20} />
                </button>
                <a 
                  href="https://docs.base.org" 
                  target="_blank"
                  className="bg-gray-100 hover:bg-gray-200 text-black text-lg font-bold py-4 px-8 rounded-full transition-colors"
                >
                  Read Docs
                </a>
              </div>
            </div>

            <div className="relative hidden lg:flex items-center justify-center h-full min-h-[500px]">
              {/* Abstract Visual Representation of "Base" */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white via-transparent to-transparent z-10"></div>
              <VisualBars />
            </div>
          </div>
        ) : (
          /* --- DASHBOARD / BUILDER STATE --- */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-5xl lg:text-6xl font-[800] tracking-tighter mb-4">Builder Activity</h1>
                <p className="text-gray-500 font-mono text-sm bg-gray-50 inline-block px-3 py-1 rounded-md">
                  {address}
                </p>
              </div>
              
              {!isOnBase && (
                <button 
                  onClick={switchToBase} 
                  className="bg-base-blue text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:shadow-xl transition-all"
                >
                  <Zap size={18} fill="currentColor" /> Switch to Base
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT COLUMN: INTERACTION */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* READ CARD */}
                <Card title="Smart Contract Status" icon={Zap}>
                  <div className="flex flex-col gap-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Greeting</span>
                        <button onClick={fetchGreeting} className="text-base-blue hover:text-blue-700 text-xs font-bold">REFRESH</button>
                      </div>
                      <div className="text-3xl font-bold text-base-blue break-words">
                        {isLoading ? (
                          <span className="opacity-50">Loading...</span>
                        ) : (
                          currentGreeting ? `"${currentGreeting}"` : <span className="text-gray-300 italic">No Data</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-sm font-bold text-gray-900">Contract Address</label>
                      <input 
                        type="text" 
                        value={contractAddress}
                        onChange={(e) => setContractAddress(e.target.value)}
                        placeholder="0x..." 
                        className="w-full bg-white border-2 border-gray-100 focus:border-base-blue rounded-xl px-4 py-3 font-mono text-sm transition-colors outline-none"
                      />
                      {!contractAddress && (
                         <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                           <AlertCircle size={14} />
                           <span>Deploy the contract on the right, then paste the address here.</span>
                         </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* WRITE CARD */}
                <Card title="Execute Transaction" icon={Terminal}>
                   <div className="flex gap-4 items-stretch">
                      <input 
                        type="text"
                        value={newGreetingInput}
                        onChange={(e) => setNewGreetingInput(e.target.value)}
                        placeholder="Hello Base..." 
                        className="flex-1 bg-gray-50 border-transparent focus:bg-white focus:border-base-blue border-2 rounded-xl px-5 py-4 text-lg font-medium transition-all outline-none"
                      />
                      <button 
                        onClick={updateGreeting}
                        disabled={isWriting || !isOnBase || !newGreetingInput}
                        className="bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white px-8 rounded-xl font-bold transition-all flex items-center gap-2"
                      >
                        {isWriting ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                      </button>
                   </div>
                   {txHash && (
                     <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium flex items-center justify-between">
                       <span className="flex items-center gap-2"><Check size={16}/> Transaction Successful</span>
                       <a href={`${BASE_EXPLORER}/tx/${txHash}`} target="_blank" className="underline hover:text-green-900 flex items-center gap-1">
                         View <ExternalLink size={12}/>
                       </a>
                     </div>
                   )}
                   {error && (
                     <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium">
                       Error: {error}
                     </div>
                   )}
                </Card>
              </div>

              {/* RIGHT COLUMN: CODE */}
              <div className="lg:col-span-1">
                <Card title="Deploy" icon={Code2} className="h-full flex flex-col">
                  <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                    To interact, you need a contract on Base. Copy this code, deploy via Remix, and paste the address.
                  </p>
                  
                  <div className="relative flex-grow bg-gray-900 rounded-xl overflow-hidden border border-gray-800 group">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 flex items-center px-3 gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    </div>
                    <pre className="p-4 pt-10 text-[10px] sm:text-xs font-mono text-gray-300 overflow-auto h-full max-h-[400px]">
                      <code>{SOLIDITY_CODE}</code>
                    </pre>
                    <button 
                      onClick={copyCode}
                      className="absolute top-10 right-2 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>

                  <a 
                    href="https://remix.ethereum.org" 
                    target="_blank"
                    className="mt-6 w-full block text-center bg-gray-100 hover:bg-gray-200 text-black font-bold py-3 rounded-xl text-sm transition-colors"
                  >
                    Open Remix IDE
                  </a>
                </Card>
              </div>

            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="w-full py-8 text-center border-t border-gray-100 mt-auto">
        <div className="flex justify-center items-center gap-8 mb-4">
          <a href="#" className="text-gray-400 hover:text-base-blue font-bold text-sm transition-colors">Terms</a>
          <a href="#" className="text-gray-400 hover:text-base-blue font-bold text-sm transition-colors">Privacy</a>
          <a href="#" className="text-gray-400 hover:text-base-blue font-bold text-sm transition-colors">Status</a>
        </div>
        <div className="flex items-center justify-center gap-2 opacity-50">
           <div className="w-2 h-2 bg-base-blue rounded-full"></div>
           <p className="text-xs font-medium text-gray-400">Powered by Base</p>
        </div>
      </footer>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);