"use client";
import React, { useState, useEffect } from 'react';

type JointData = {
  date: string;
  shoulders: number;
  lowerBack: number;
  knees: number;
};

export default function InjuryPredictor() {
  const [history, setHistory] = useState<JointData[]>([]);
  const [shoulders, setShoulders] = useState(0);
  const [lowerBack, setLowerBack] = useState(0);
  const [knees, setKnees] = useState(0);
  const [loggedToday, setLoggedToday] = useState(false);

  useEffect(() => {
    // Load joint strain history from local storage
    const savedData = localStorage.getItem('apex_injury_tracker');
    if (savedData) {
      const parsedData: JointData[] = JSON.parse(savedData);
      setHistory(parsedData);

      // Check if they already logged today
      const today = new Date().toDateString();
      if (parsedData.length > 0 && parsedData[parsedData.length - 1].date === today) {
        setLoggedToday(true);
        setShoulders(parsedData[parsedData.length - 1].shoulders);
        setLowerBack(parsedData[parsedData.length - 1].lowerBack);
        setKnees(parsedData[parsedData.length - 1].knees);
      }
    }
  }, []);

  const logStrain = () => {
    const today = new Date().toDateString();
    const newEntry = { date: today, shoulders, lowerBack, knees };
    
    // Keep only the last 7 days to analyze recent trends
    const updatedHistory = [...history.filter(h => h.date !== today), newEntry].slice(-7);
    
    setHistory(updatedHistory);
    setLoggedToday(true);
    localStorage.setItem('apex_injury_tracker', JSON.stringify(updatedHistory));
  };

  // --- INJURY PREDICTION ALGORITHM ---
  const analyzeRisk = () => {
    if (history.length < 2) return { status: "Gathering Data", color: "text-blue-400", message: "Need at least 2 days of logs to predict trends." };

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    let highestJump = 0;
    let problemArea = "";

    // Check which joint spiked the most in strain
    if (latest.shoulders - previous.shoulders > highestJump) { highestJump = latest.shoulders - previous.shoulders; problemArea = "Shoulders"; }
    if (latest.lowerBack - previous.lowerBack > highestJump) { highestJump = latest.lowerBack - previous.lowerBack; problemArea = "Lower Back"; }
    if (latest.knees - previous.knees > highestJump) { highestJump = latest.knees - previous.knees; problemArea = "Knees"; }

    // Check absolute danger zones (Any joint > 7)
    if (latest.shoulders > 7) return { status: "CRITICAL RISK", color: "text-red-500", message: "Shoulder strain is dangerously high. Cease pressing movements." };
    if (latest.lowerBack > 7) return { status: "CRITICAL RISK", color: "text-red-500", message: "Lower back is compromised. Avoid deadlifts and heavy squats today." };
    if (latest.knees > 7) return { status: "CRITICAL RISK", color: "text-red-500", message: "Knee strain is critical. Rest required." };

    // Check trend danger zones (Spike of +3 or more in one day)
    if (highestJump >= 3) {
      return { status: "WARNING", color: "text-yellow-400", message: `Sudden spike in ${problemArea} strain detected. Reduce volume by 40%.` };
    }

    return { status: "OPTIMAL", color: "text-green-400", message: "Movement patterns stable. Cleared for heavy lifting." };
  };

  const risk = analyzeRisk();

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl w-full max-w-sm mx-auto my-8 font-sans">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Injury Radar</h3>
        <span className="bg-red-600/20 text-red-400 text-xs font-bold px-2 py-1 rounded">BETA</span>
      </div>

      {/* AI Risk Output */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-6 text-center">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">System Status</p>
        <p className={`text-xl font-extrabold ${risk.color} animate-pulse mb-2`}>{risk.status}</p>
        <p className="text-gray-300 text-sm leading-tight">{risk.message}</p>
      </div>

      {/* Strain Sliders */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-xs font-semibold text-gray-400 mb-1">
            <span>Shoulders</span>
            <span>{shoulders}/10</span>
          </div>
          <input type="range" min="0" max="10" value={shoulders} onChange={(e) => setShoulders(Number(e.target.value))} disabled={loggedToday}
            className="w-full accent-blue-500 bg-gray-700 rounded-lg appearance-none h-2" />
        </div>
        
        <div>
          <div className="flex justify-between text-xs font-semibold text-gray-400 mb-1">
            <span>Lower Back</span>
            <span>{lowerBack}/10</span>
          </div>
          <input type="range" min="0" max="10" value={lowerBack} onChange={(e) => setLowerBack(Number(e.target.value))} disabled={loggedToday}
            className="w-full accent-blue-500 bg-gray-700 rounded-lg appearance-none h-2" />
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-gray-400 mb-1">
            <span>Knees</span>
            <span>{knees}/10</span>
          </div>
          <input type="range" min="0" max="10" value={knees} onChange={(e) => setKnees(Number(e.target.value))} disabled={loggedToday}
            className="w-full accent-blue-500 bg-gray-700 rounded-lg appearance-none h-2" />
        </div>
      </div>

      {/* Submit Button */}
      {!loggedToday ? (
        <button 
          onClick={logStrain}
          className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          Log Post-Workout Strain
        </button>
      ) : (
        <button 
          onClick={() => setLoggedToday(false)}
          className="w-full bg-gray-800 text-gray-400 font-bold py-3 rounded-xl transition-all duration-200 border border-gray-600"
        >
          Edit Today's Log
        </button>
      )}
    </div>
  );
}