import React, { useState } from 'react';
import { Settings, X, ChevronDown, Type, Eye, Sparkles, BookOpen, Palette, Layout, Moon } from 'lucide-react';

const ReadingSettingsDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('regular');
  const [fontSize, setFontSize] = useState(24);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [letterSpacing, setLetterSpacing] = useState(0);
  
  // Reading aids toggles
  const [showNikud, setShowNikud] = useState(true);
  const [showSyllables, setShowSyllables] = useState(false);
  const [highlightSofit, setHighlightSofit] = useState(false);
  const [highlightConnectors, setHighlightConnectors] = useState(false);
  
  // Text analysis toggles
  const [highlightVerbs, setHighlightVerbs] = useState(false);
  const [highlightNouns, setHighlightNouns] = useState(false);
  
  // Color theme
  const [colorTheme, setColorTheme] = useState('default');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Font family
  const [fontFamily, setFontFamily] = useState('system');

  const resetToDefaults = () => {
    setViewMode('regular');
    setFontSize(24);
    setLineHeight(1.8);
    setLetterSpacing(0);
    setShowNikud(true);
    setShowSyllables(false);
    setHighlightSofit(false);
    setHighlightConnectors(false);
    setHighlightVerbs(false);
    setHighlightNouns(false);
    setColorTheme('default');
    setIsDarkMode(false);
    setFontFamily('system');
  };

  return (
    <div dir="rtl" className="relative">
      {/* כפתור הפעלה צף */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:scale-110 transition-all z-40 group"
        aria-label="פתח הגדרות תצוגה"
      >
        <Settings size={24} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Overlay - שכבת רקע כהה */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ה-Drawer (המגירה) */}
      <div 
        className={`fixed inset-y-0 left-0 w-96 bg-white shadow-2xl z-50 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out border-r border-slate-200`}
        role="dialog"
        aria-labelledby="drawer-title"
      >
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-l from-indigo-50/50 to-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Settings className="text-indigo-600" size={20} />
            </div>
            <h2 id="drawer-title" className="font-bold text-slate-800 text-lg">הגדרות תצוגה</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
            aria-label="סגור"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - האזור עם הקבוצות */}
        <div className="overflow-y-auto h-[calc(100vh-160px)] p-5 space-y-3">
          
          {/* קבוצה 1: מצב תצוגה (Segmented Control) */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50">
            <label className="text-xs font-bold text-slate-600 block mb-3 uppercase tracking-wider flex items-center gap-2">
              <Layout size={14} />
              מבנה טקסט
            </label>
            <div className="flex bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
              <button 
                onClick={() => setViewMode('regular')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'regular' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                רגיל
              </button>
              <button 
                onClick={() => setViewMode('pyramid')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'pyramid' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                פירמידה
              </button>
            </div>
          </div>

          {/* אקורדיונים */}
          <div className="space-y-2">
            
            {/* אקורדיון: הגדרות גופן */}
            <details className="group border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow" open>
              <summary className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-slate-50 list-none transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-indigo-50 rounded-lg">
                    <Type size={18} className="text-indigo-600" />
                  </div>
                  <span className="font-semibold text-slate-700">טיפוגרפיה</span>
                </div>
                <ChevronDown size={18} className="text-slate-400 group-open:rotate-180 transition-transform duration-200" />
              </summary>
              <div className="p-4 pt-2 space-y-4 bg-slate-50/30">
                {/* גודל גופן */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-medium">גודל גופן</span>
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono">{fontSize}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="16" 
                    max="48" 
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>16px</span>
                    <span>48px</span>
                  </div>
                </div>

                {/* גובה שורה */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-medium">גובה שורה</span>
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono">{lineHeight.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1.2" 
                    max="3" 
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* ריווח אותיות */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-medium">ריווח אותיות</span>
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono">{letterSpacing}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="-2" 
                    max="8" 
                    value={letterSpacing}
                    onChange={(e) => setLetterSpacing(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* משפחת גופן */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 block">משפחת גופן</label>
                  <select 
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    <option value="system">ברירת מחדל</option>
                    <option value="narkis">נרקיסים</option>
                    <option value="arial">Arial</option>
                    <option value="david">דוד</option>
                  </select>
                </div>
              </div>
            </details>

            {/* אקורדיון: עזרי קריאה */}
            <details className="group border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <summary className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-slate-50 list-none transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <Sparkles size={18} className="text-amber-600" />
                  </div>
                  <span className="font-semibold text-slate-700">עזרי קריאה</span>
                </div>
                <ChevronDown size={18} className="text-slate-400 group-open:rotate-180 transition-transform duration-200" />
              </summary>
              <div className="p-4 pt-2 space-y-3 bg-slate-50/30">
                <ToggleItem label="הצג ניקוד" checked={showNikud} onChange={setShowNikud} />
                <ToggleItem label="חלוקה להברות" checked={showSyllables} onChange={setShowSyllables} />
                <ToggleItem label="הדגשת סופיות" checked={highlightSofit} onChange={setHighlightSofit} />
                <ToggleItem label="מילות קישור" checked={highlightConnectors} onChange={setHighlightConnectors} />
              </div>
            </details>

            {/* אקורדיון: ניתוח טקסט */}
            <details className="group border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <summary className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-slate-50 list-none transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                    <BookOpen size={18} className="text-emerald-600" />
                  </div>
                  <span className="font-semibold text-slate-700">ניתוח טקסט</span>
                </div>
                <ChevronDown size={18} className="text-slate-400 group-open:rotate-180 transition-transform duration-200" />
              </summary>
              <div className="p-4 pt-2 space-y-3 bg-slate-50/30">
                <ToggleItem label="סימון פעלים" checked={highlightVerbs} onChange={setHighlightVerbs} />
                <ToggleItem label="סימון שמות עצם" checked={highlightNouns} onChange={setHighlightNouns} />
              </div>
            </details>

            {/* אקורדיון: ערכת צבעים */}
            <details className="group border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <summary className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-slate-50 list-none transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-pink-50 rounded-lg">
                    <Palette size={18} className="text-pink-600" />
                  </div>
                  <span className="font-semibold text-slate-700">ערכת צבעים</span>
                </div>
                <ChevronDown size={18} className="text-slate-400 group-open:rotate-180 transition-transform duration-200" />
              </summary>
              <div className="p-4 pt-2 space-y-3 bg-slate-50/30">
                <div className="grid grid-cols-2 gap-2">
                  <ColorThemeButton 
                    label="ברירת מחדל" 
                    colors={['bg-white', 'bg-slate-800']}
                    isActive={colorTheme === 'default'}
                    onClick={() => setColorTheme('default')}
                  />
                  <ColorThemeButton 
                    label="ספיה" 
                    colors={['bg-amber-50', 'bg-amber-900']}
                    isActive={colorTheme === 'sepia'}
                    onClick={() => setColorTheme('sepia')}
                  />
                  <ColorThemeButton 
                    label="כחול" 
                    colors={['bg-blue-50', 'bg-blue-900']}
                    isActive={colorTheme === 'blue'}
                    onClick={() => setColorTheme('blue')}
                  />
                  <ColorThemeButton 
                    label="ירוק" 
                    colors={['bg-green-50', 'bg-green-900']}
                    isActive={colorTheme === 'green'}
                    onClick={() => setColorTheme('green')}
                  />
                </div>
                
                <div className="pt-2 border-t border-slate-200">
                  <ToggleItem 
                    label="מצב כהה" 
                    checked={isDarkMode} 
                    onChange={setIsDarkMode}
                    icon={<Moon size={16} className="text-slate-500" />}
                  />
                </div>
              </div>
            </details>

          </div>
        </div>

        {/* Footer - כפתור איפוס */}
        <div className="p-4 border-t border-slate-200 bg-white sticky bottom-0">
          <button 
            onClick={resetToDefaults}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 group"
          >
            <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            איפוס להגדרות ברירת מחדל
          </button>
        </div>
      </div>
    </div>
  );
};

// רכיב עזר למתג (Toggle) משופר
const ToggleItem = ({ label, checked, onChange, icon }) => (
  <div className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-white/50 transition-colors">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm text-slate-700 font-medium">{label}</span>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer" 
      />
      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-sm"></div>
    </label>
  </div>
);

// רכיב עזר לכפתור ערכת צבעים
const ColorThemeButton = ({ label, colors, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-lg border-2 transition-all ${
      isActive 
        ? 'border-indigo-600 bg-indigo-50 shadow-md scale-105' 
        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
    }`}
  >
    <div className="flex gap-1 mb-2">
      {colors.map((color, i) => (
        <div key={i} className={`flex-1 h-6 ${color} rounded border border-slate-200`} />
      ))}
    </div>
    <span className="text-xs font-medium text-slate-600">{label}</span>
  </button>
);

export default ReadingSettingsDrawer;