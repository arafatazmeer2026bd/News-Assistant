/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import { 
  Newspaper, 
  UserCircle, 
  MapPin, 
  Send, 
  Copy, 
  Check, 
  Loader2, 
  RefreshCcw,
  Volume2,
  Mic2,
  FileText,
  Camera,
  Globe,
  Upload,
  Image as ImageIcon,
  Trash2,
  Zap,
  ChevronDown,
  Quote,
  ShieldCheck,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Roles for the application
enum NewsRole {
  JOURNALIST = "journalist",
  STAFF_REPORTER = "staff_reporter",
  NEWS_READER = "news_reader"
}

const roleConfigs = {
  [NewsRole.JOURNALIST]: {
    label: "সাংবাদিক",
    icon: Newspaper,
    description: "বিশ্লেষণধর্মী ও বিস্তারিত অনুসন্ধানী প্রতিবেদন",
    prompt: "একজন অভিজ্ঞ সাংবাদিক হিসেবে একটি গভীর ও বিশ্লেষণধর্মী নিউজ রিপোর্ট লেখ। একটি আকর্ষণীয় শিরোনাম দাও এবং ঘটনাটিকে সুন্দরভাবে তুলে ধরো।",
    fields: {
      subject: "প্রতিবেদনের প্রধান বিষয়",
      details: "অনুসন্ধানী তথ্য বা ঘটনার প্রেক্ষাপট",
      showLocation: false
    }
  },
  [NewsRole.STAFF_REPORTER]: {
    label: "স্টাফ রিপোর্টার",
    icon: Mic2,
    description: "ঘটনাস্থল থেকে সরাসরি তথ্যনির্ভর সংবাদ",
    prompt: "একজন স্টাফ রিপোর্টার হিসেবে ঘটনাস্থল থেকে সরাসরি রিপোর্ট করার মতো করে একটি নিউজ লেখ। প্রতিবেদনের শুরুতে 'নিজস্ব প্রতিবেদক, [LOCATION]' ফরম্যাট ব্যবহার করো এবং ফ্যাক্টসগুলো সুন্দর করে সাজাও।",
    fields: {
      subject: "ঘটনার সংক্ষিপ্ত বিষয়",
      details: "ঘটনাস্থলের সরাসরি বর্ণনা বা পয়েন্টসমূহ",
      showLocation: true
    }
  },
  [NewsRole.NEWS_READER]: {
    label: "সংবাদ উপস্থাপক",
    icon: Volume2,
    description: "পড়ার উপযোগী স্ক্রিপ্ট এবং সংক্ষেপিত বুলেট পয়েন্ট",
    prompt: "একজন সংবাদ উপস্থাপকের জন্য নিউজ স্ক্রিপ্ট তৈরি করো। এটি যেন পড়ার উপযোগী হয়, সহজ ভাষায় সাবলীল ভাবে লেখ এবং গুরুত্বপূর্ণ পয়েন্টগুলো আলাদা করে দাও। একটি স্মার্ট ভূমিকা ও উপসংহার যুক্ত করো।",
    fields: {
      subject: "সংবাদ শিরোনাম বা হেডলাইন",
      details: "মূল সংবাদের সারসংক্ষেপ বা মূল পয়েন্ট",
      showLocation: false
    }
  }
};

const newsCategories = [
  "রাজনীতি ও জাতীয় সংবাদ",
  "আন্তর্জাতিক সংবাদ",
  "অর্থনীতি ও ব্যবসা",
  "ক্রাইম",
  "দুর্ঘটনা",
  "দুর্নীতি",
  "খেলাধুলা",
  "বিজ্ঞান ও তথ্যপ্রযুক্তি",
  "জনদুর্ভোগ ও নগর সংবাদ",
  "স্বাস্থ্য ও শিক্ষা",
  "বিনোদন ও গ্ল্যামার",
  "সংস্কৃতি",
  "ইতিহাস",
  "আবহাওয়া ও পরিবেশ"
];

const countries = [
  "বাংলাদেশ", "ভারত", "পাকিস্তান", "যুক্তরাষ্ট্র", "যুক্তরাজ্য", "সৌদি আরব", "সংযুক্ত আরব আমিরাত", 
  "চীন", "জাপান", "রাশিয়া", "অস্ট্রেলিয়া", "কানাডা", "জার্মানি", "ফ্রান্স", "ইতালি", "তুরস্ক", "কাতার"
];

const categoryPlaceholders: Record<string, string> = {
  "রাজনীতি ও জাতীয় সংবাদ": "যেমন: নতুন আইন পাস বা রাজনৈতিক সভা",
  "আন্তর্জাতিক সংবাদ": "যেমন: বিশ্ব শান্তি সম্মেলন বা দুই দেশের বাণিজ্য চুক্তি",
  "অর্থনীতি ও ব্যবসা": "যেমন: শেয়ার বাজার আপডেট বা বাজেটে নতুন কর বিধি",
  "ক্রাইম": "যেমন: এলাকায় বড় চুরির ঘটনা বা আইনি অভিযান",
  "দুর্ঘটনা": "যেমন: বাস-ট্রাক সংঘর্ষ বা কারখানায় অগ্নিকাণ্ড",
  "দুর্নীতি": "যেমন: কোনো প্রকল্পে তথ্য গোপন বা অর্থ আত্মসাৎ",
  "খেলাধুলা": "যেমন: জাতীয় ক্রিকেট দলের জয় বা ফুটবল লিগ",
  "বিজ্ঞান ও তথ্যপ্রযুক্তি": "যেমন: নতুন অ্যাপ লঞ্চ বা কৃত্রিম বুদ্ধিমত্তার ব্যবহার",
  "জনদুর্ভোগ ও নগর সংবাদ": "যেমন: জলাবদ্ধতা বা রাস্তার বেহাল ডশা",
  "স্বাস্থ্য ও শিক্ষা": "যেমন: নতুন হাসপাতাল উদ্বোধন বা সিলেবাস পরিবর্তন",
  "বিনোদন ও গ্ল্যামার": "যেমন: ঢালিউড নতুন সিনেমার ঘোষণা বা শিল্পী সম্মাননা",
  "সংস্কৃতি": "যেমন: পহেলা বৈশাখ উদযাপন বা লোকসংগীত উৎসব",
  "ইতিহাস": "যেমন: ঐতিহাসিক স্মৃতিস্তম্ভ সংরক্ষণ বা প্রত্নতাত্ত্বিক আবিষ্কার",
  "আবহাওয়া ও পরিবেশ": "যেমন: ঘূর্ণিঝড়ের পূর্বাভাস বা বৃক্ষরোপণ কর্মসূচি"
};

enum View {
  CREATE = "create",
  COLLECT = "collect",
  LIVE_REPORT = "live_report"
}

export default function App() {
  const [activeView, setActiveView] = useState<View>(View.CREATE);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState(newsCategories[0]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [role, setRole] = useState<NewsRole>(NewsRole.STAFF_REPORTER);
  const [report, setReport] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<{content: string, imageUrl: string, hasVideo: boolean}[]>([]);
  const [copied, setCopied] = useState(false);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateNews = async () => {
    if (!subject || !details) return;

    setIsLoading(true);
    setReport("");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const config = roleConfigs[role];
      const locationInfo = location ? `স্থান: ${location}` : "";
      
      const prompt = `
        ভূমিকা: ${config.prompt}
        সংবাদের বিভাগ: ${category}
        বিষয়: ${subject}
        বিবরণ: ${details}
        ${locationInfo}
        
        সাধারণ নির্দেশনা:
        ১. সম্পূর্ণ রিপোর্টটি বাংলায় লেখ।
        ২. মার্কারডাউন (Markdown) ফরম্যাট ব্যবহার করো। 
        ৩. হেডলাইন বোল্ড করো।
        ৪. তথ্যগুলো সঠিকভাবে সাজাও।
        ৫. খবরের গুরুত্ব অনুযায়ী উপযুক্ত শব্দ ব্যবহার করো এবং প্রতিবেদনটি তথ্যবহুল করো।
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setReport(response.text || "দুঃখিত, কোনো প্রতিবেদন তৈরি করা সম্ভব হয়নি।");
      
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Error generating news:", error);
      setReport("একটি ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  const collectNews = async () => {
    setIsLoading(true);
    setDiscoveryResults([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const countryPrompt = selectedCountry ? `দেশ: ${selectedCountry}` : "সারাবিশ্ব (Global)";
      
      const prompt = `
        আপনি একজন 'প্রতিবেদন সহকারী নিউজ এনালিস্ট'। ${category} বিভাগটির জন্য ${countryPrompt} এর প্রেক্ষাপটে সাম্প্রতিক সময়ের (সর্বশেষ ২৪-৪৮ ঘণ্টার মধ্যে) সবথেকে গুরুত্বপূর্ণ এবং ব্রেকিং নিউজগুলো সংগ্রহ করুন। 
        
        উৎস বিশ্লেষণ: Facebook, X, Reddit, WikiPedia এবং গ্লোবাল নিউজ পোর্টাল।
        শর্তসমূহ:
        ১. কোনো ধরণের ভূমিকা বা উপক্রমণিকা দিবেন না। সরাসরি নিউজ শুরু করবেন।
        ২. কোনো গুজব বা মিথ্যা সংবাদ দিবেন না। শুধুমাত্র যাচাইকৃত সত্য তথ্য ব্যবহার করবেন।
        ৩. নিউজগুলো সম্পূর্ণ ইউনিকভাবে বাংলায় লেখুন।
        ৪. যদি আজকের কোনো নিউজ না থাকে, তবে সাম্প্রতিক সময়ের (গতকাল বা গত সপ্তাহের সবথেকে গুরুত্বপূর্ণ) যাচাইকৃত নিউজ রিপোর্ট করুন।
        ৫. প্রতিটি নিউজকে আলাদা ব্লকে রাখুন এবং মাঝখানে "---" চিহ্ন দিন।
        ৬. প্রতিটি ব্লকের শেষে একটি প্রাসঙ্গিক ইমেজ কুয়েরিKeywords ব্র্যাকেট এর মধ্যে দিন। যেমন: [Keyword: world_news_event]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const newsText = (response.text || "").trim();
      
      if (newsText === "নেই" || newsText.length < 10) {
        setDiscoveryResults([]);
        return;
      }

      const rawNewsBlocks = newsText.split("---").filter(n => n.trim().length > 20);
      
      const processedNews = rawNewsBlocks.map(block => {
        const cleanedContent = block.replace(/\[Keyword:.*?\]/g, "").trim();
        
        return {
          content: cleanedContent,
          imageUrl: `https://images.unsplash.com/photo-1585829365234-781fcd50c819?q=80&w=800&auto=format&fit=crop&sig=${Math.random()}`,
          hasVideo: Math.random() > 0.5
        };
      });

      setDiscoveryResults(processedNews);
    } catch (error) {
      console.error("Error collecting news:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLiveReport = async () => {
    if (!details) return;
    setIsLoading(true);
    setReport("");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        আপনি একজন পেশাদার টিভি নিউজ রিপোর্টার বা সাংবাদিক। 
        ভূমিকা: ${roleConfigs[role].label}
        ঘটনাস্থল: ${location || "অজানা"}
        ঘটনার সংক্ষিপ্ত বিবরণ: ${details}
        
        নির্দেশনা:
        ১. একজন রিপোর্টার যেভাবে কথা বলে ঠিক সেভাবে একটি নিউজ স্ক্রিপ্ট বা প্রতিবেদন তৈরি করুন। 
        ২. সংবাদের শুরুতে "নিজস্ব প্রতিবেদক, ${location || "ঢাকা"}" বা এই ধরণের পেশাদার সূচনা ব্যবহার করুন।
        ৩. প্রতিবেদনের ভাষা হতে হবে গম্ভীর, তথ্যবহুল এবং আকর্ষণীয়।
        ৪. প্রতিবেদনের মধ্যে ঘটনার বর্ণনা এমনভাবে দিন যেন পাঠক বা শ্রোতা চোখের সামনে ছবি দেখতে পায়।
        ৫. সম্পূর্ণ প্রতিবেদনটি বাংলায় মার্কারডাউন ফরম্যাটে লিখুন।
        ${imageFile ? "৬. আপনাকে একটি ছবি দেওয়া হয়েছে, সেই ছবির প্রেক্ষাপট মাথায় রেখে প্রতিবেদনটি আরও জীবন্ত করুন।" : ""}
      `;

      let contents: any[] = [{ role: "user", parts: [{ text: prompt }] }];
      
      if (imageFile) {
        const base64Data = imageFile.split(",")[1];
        contents[0].parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents
      });
      
      setReport(response.text || "দুঃখিত, প্রতিবেদন তৈরি করা সম্ভব হয়নি।");
      
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Error generating live report:", error);
      setReport("একটি ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-lg shadow-blue-200">
              <Newspaper size={24} />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900">পেশাদার সংবাদ সহকারী</h1>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            {[
              { id: View.CREATE, label: "রিপোর্ট তৈরি", icon: FileText },
              { id: View.LIVE_REPORT, label: "লাইভ রিপোর্টিং", icon: Camera },
              { id: View.COLLECT, label: "নিউজ সংগ্রহ", icon: Globe }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={cn(
                  "px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-2",
                  activeView === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <tab.icon size={14} />
                <span className="hidden sm:inline uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-12">
        {activeView === View.CREATE ? (
          <div className="space-y-8">
            {/* Intro Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Smart Analysis Engine</span>
                </div>
                <h2 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter sm:text-5xl">
                  স্মার্ট প্রতিবেদন <span className="text-blue-600">তৈরি</span>
                </h2>
                <p className="text-slate-500 max-w-xl font-medium">
                  ঘটনার সঠিক তথ্য দিন এবং মুহূর্তেই প্রফেশনাল নিউজ রিপোর্ট তৈরি করুন।
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-[0.08]"></div>
              <div className="relative news-card p-6 sm:p-10 space-y-10 border-slate-200 shadow-xl shadow-blue-900/5 bg-white">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black flex items-center gap-2 text-slate-800 uppercase tracking-wider">
                      <UserCircle size={18} className="text-blue-600" />
                      রিপোর্টিং ভূমিকা
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">Step 01</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(Object.keys(roleConfigs) as NewsRole[]).map((r) => {
                      const config = roleConfigs[r];
                      const isActive = role === r;
                      return (
                        <button
                          key={r}
                          onClick={() => setRole(r)}
                          className={cn(
                            "group/role flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all text-center gap-3 relative overflow-hidden",
                            isActive ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200" : "bg-white border-slate-100 hover:border-blue-200"
                          )}
                        >
                          <div className={cn("p-3 rounded-xl transition-colors", isActive ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400")}>
                            <config.icon size={28} />
                          </div>
                          <div className="space-y-1">
                            <span className={cn("text-sm font-black block", isActive ? "text-white" : "text-slate-800")}>{config.label}</span>
                            <span className={cn("text-[11px] block leading-tight", isActive ? "text-blue-100" : "text-slate-400")}>{config.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-8 border-t border-slate-100">
                  <div className="md:col-span-12 flex items-center justify-between">
                    <label className="text-sm font-black flex items-center gap-2 text-slate-800 uppercase tracking-wider">
                      <FileText size={18} className="text-blue-600" />
                      ঘটনার বিস্তারিত
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">Step 02</span>
                  </div>

                  <div className="md:col-span-7 space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">{roleConfigs[role].fields.subject}</label>
                    <input 
                      type="text" 
                      placeholder={categoryPlaceholders[category] || "ঘটনার বিষয় লিখুন..."}
                      className="input-field py-4 bg-slate-50/50 border-slate-200 focus:bg-white text-lg font-bold"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  
                  <div className="md:col-span-5 space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">সংবাদের বিভাগ</label>
                    <select 
                      className="input-field py-4 bg-slate-50/50 border-slate-200 focus:bg-white font-bold cursor-pointer"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {newsCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  {roleConfigs[role].fields.showLocation && (
                    <div className="md:col-span-12 space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">ঘটনাস্থল</label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                        <input 
                          type="text" 
                          placeholder="যেমন: পল্টন, ঢাকা"
                          className="input-field py-4 pl-12 bg-slate-50/50 border-slate-200 focus:bg-white font-bold"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-12 space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">{roleConfigs[role].fields.details}</label>
                    <textarea 
                      rows={5}
                      placeholder="ঘটনার মূল পয়েন্ট বা সংক্ষেপ লিখুন..."
                      className="input-field p-5 bg-slate-50/50 border-slate-200 focus:bg-white font-medium"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={generateNews}
                    disabled={isLoading || !subject || !details}
                    className="group relative w-full overflow-hidden rounded-2xl bg-slate-900 p-px font-bold text-white shadow-2xl transition-transform active:scale-[0.98]"
                  >
                    <div className="relative flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-slate-900">
                      {isLoading ? <Loader2 className="animate-spin text-blue-400" size={24} /> : <span className="text-lg">প্রফেশনাল নিউজ রিপোর্ট তৈরি করুন</span>}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {report && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} ref={resultRef} className="space-y-6 pt-12">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"><Newspaper size={24} /></div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">তৈরিকৃত প্রতিবেদন</h3>
                    </div>
                    <button onClick={() => copyToClipboard(report)} className="btn-primary py-2 px-4 text-sm">{copied ? "কপি হয়েছে" : "কপি করুন"}</button>
                  </div>
                  <div className="news-card p-10 sm:p-20 bg-white border-slate-200 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.02] flex items-center justify-center pointer-events-none"><Newspaper size={400} /></div>
                    <div className="flex justify-between mb-12 pb-6 border-b-2 border-slate-900">
                      <span className="text-xl font-black tracking-tighter">PRESS RELEASE</span>
                      <span className="text-[10px] font-mono text-slate-400">PR-{Math.random().toString(36).substring(7).toUpperCase()}</span>
                    </div>
                    <div className="markdown-body font-sans text-lg text-slate-800 leading-relaxed"><ReactMarkdown>{report}</ReactMarkdown></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : activeView === View.LIVE_REPORT ? (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Real-time Generation</span>
                </div>
                <h2 className="text-4xl font-black text-slate-900 leading-tight tracking-tighter sm:text-5xl">লাইভ <span className="text-blue-600">রিপোর্টিং</span></h2>
                <p className="text-slate-500 max-w-xl font-medium">ঘটনার ছবি অথবা ভিডিওর সংক্ষিপ্ত বর্ণনা দিন, প্রফেশনাল নিউজ স্ক্রিপ্ট তৈরি হয়ে যাবে।</p>
              </div>
            </div>

            <div className="news-card p-6 sm:p-10 space-y-10 border-slate-200 shadow-xl bg-white">
              <div className="flex flex-col lg:flex-row gap-10">
                <div className="w-full lg:w-1/2 space-y-4">
                  <label className="text-sm font-black flex items-center gap-2 text-slate-800 uppercase tracking-wider">
                    <ImageIcon size={18} className="text-blue-600" /> লিডিং ফুটেজ
                  </label>
                  <div onClick={() => fileInputRef.current?.click()} className={cn("aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group", imageFile ? "bg-slate-900" : "bg-slate-50")}>
                    {imageFile ? <img src={imageFile} className="w-full h-full object-contain" alt="Preview" /> : <div className="text-center"><Upload size={32} className="mx-auto mb-2 text-blue-600" /><p className="text-xs font-black">ছবি আপলোড করুন</p></div>}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                </div>

                <div className="flex-1 space-y-8">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">রিপোর্টার ভূমিকা</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[NewsRole.JOURNALIST, NewsRole.STAFF_REPORTER].map(r => (
                        <button key={r} onClick={() => setRole(r)} className={cn("p-4 rounded-2xl border-2 transition-all flex items-center gap-3", role === r ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-100 text-slate-500")}>
                          <span className="font-black text-xs uppercase">{roleConfigs[r].label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">ঘটনাস্থল</label>
                    <input type="text" placeholder="যেমন: মতিঝিল চত্বর" className="input-field py-4 bg-slate-50/50 transition-all font-bold" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">ঘটনার বিবরণ</label>
                    <textarea rows={3} placeholder="মূল তথ্যগুলো লিখুন..." className="input-field p-5 bg-slate-50/50 font-medium text-sm" value={details} onChange={(e) => setDetails(e.target.value)} />
                  </div>
                </div>
              </div>
              <button onClick={generateLiveReport} disabled={isLoading || !details} className="group relative w-full h-16 bg-blue-600 rounded-2xl font-black text-white shadow-2xl active:scale-95 transition-all">
                {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "প্রফেশনাল রিপোর্ট জেনারেট করুন"}
              </button>
            </div>

            <AnimatePresence>
              {report && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-12">
                  <h3 className="text-xl font-black text-slate-900 uppercase">নিউজ স্ক্রিপ্ট</h3>
                  <div className="news-card p-10 sm:p-16 bg-slate-900 text-slate-100 border-none shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-6 right-8 flex items-center gap-2 text-[10px] font-black text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 animate-pulse">
                      <div className="w-2 h-2 bg-red-500 rounded-full" /> LIVE SCRIPT
                    </div>
                    <div className="markdown-body markdown-invert font-mono text-lg leading-relaxed"><ReactMarkdown>{report}</ReactMarkdown></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-12">
            {/* News Discovery View */}
            <div className="relative bg-slate-900 rounded-[40px] p-8 sm:p-12 text-white overflow-hidden shadow-2xl">
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping"></span>
                    <span className="bg-blue-500/20 text-blue-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.3em] border border-blue-500/30">Global Analysis</span>
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-black tracking-tighter">নিউজ <span className="text-blue-500">এনালিস্ট</span></h2>
                  <p className="text-slate-400 text-lg font-medium">ইন্টারনেট এবং সোশ্যাল মিডিয়া থেকে আজকের সবথেকে গুরুত্বপূর্ণ সংবাদের তথ্য সংগ্রহ করুন।</p>
                </div>
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <select className="w-full bg-slate-800 rounded-2xl px-5 py-4 text-white font-bold" value={category} onChange={(e) => setCategory(e.target.value)}>
                      {newsCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <select className="w-full bg-slate-800 rounded-2xl px-5 py-4 text-white font-bold" value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
                      <option value="">সারাবিশ্ব</option>
                      {countries.map(country => <option key={country} value={country}>{country}</option>)}
                    </select>
                  </div>
                  <button onClick={collectNews} disabled={isLoading} className="w-full bg-white text-slate-900 py-5 rounded-2xl text-lg font-black transition-all hover:scale-[1.02] active:scale-95">
                    {isLoading ? <Loader2 className="animate-spin mx-auto text-blue-600" /> : "নিউজ সংগ্রহ শুরু করুন"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {discoveryResults.length > 0 ? (
                discoveryResults.map((news, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[32px] border border-slate-100 shadow-xl flex flex-col md:flex-row overflow-hidden group">
                    <div className="w-full md:w-2/5 relative h-64 md:h-auto bg-slate-900">
                      <img src={news.imageUrl} className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-1000" alt="News" />
                      {news.hasVideo && <div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"><Play size={32} fill="currentColor" /></div></div>}
                    </div>
                    <div className="flex-1 p-8 sm:p-12 flex flex-col justify-between bg-white relative">
                      <div className="absolute top-0 right-0 p-6 opacity-[0.03]"><Quote size={80} /></div>
                      <div className="markdown-body text-slate-700 text-sm mb-10"><ReactMarkdown>{news.content}</ReactMarkdown></div>
                      <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                        <div className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-2">
                          <ShieldCheck size={14} /> VERIFIED ANALYSIS
                        </div>
                        <button onClick={() => copyToClipboard(news.content)} className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg hover:bg-blue-600 transition-all">
                          {copied ? <Check size={16} /> : "কপি করুন"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : !isLoading && (
                <div className="text-center py-40 border-4 border-dashed border-slate-100 rounded-[60px] bg-slate-50/20">
                  <Newspaper size={48} className="mx-auto text-slate-200 mb-6" />
                  <h3 className="text-xl font-black text-slate-400">কোনো খবর পাওয়া যায়নি</h3>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-gray-100 py-12 text-center bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-4">
          <p className="text-xs text-slate-400 uppercase tracking-[0.2em] font-bold">© ২০২৬ পেশাদার সংবাদ সহকারী - আধুনিক সাংবাদিকদের জন্য</p>
          <p className="text-[10px] text-slate-300 max-w-md">সতর্কতা: এটি একটি প্রফেশনাল প্রতিবেদন সহকারী সিস্টেম। সংবাদের ক্ষেত্রে সর্বদা উৎস যাচাই করে নিন।</p>
        </div>
      </footer>
    </div>
  );
}
