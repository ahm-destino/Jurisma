import React from "react";
import { Star, Clock, CheckCircle, Shield, Award, Calendar } from "lucide-react";
import { Card, Badge } from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";

// 1. Recognition Badge
export const RecognitionBadge = ({ tier }) => {
  const configs = {
    verified_mentor: { label: "Verified Mentor", color: "text-blue-600 bg-blue-50 border-blue-100", icon: CheckCircle },
    active_mentor: { label: "Active Mentor 2024", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: Star },
    distinguished_mentor: { label: "Distinguished Mentor", color: "text-purple-600 bg-purple-50 border-purple-100", icon: Award },
    legacy_contributor: { label: "Legacy Contributor", color: "text-amber-700 bg-amber-50 border-amber-100", icon: Shield },
  };

  const config = configs[tier] || configs.verified_mentor;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.color}`}>
      <Icon size={12} className="mr-1" />
      {config.label}
    </span>
  );
};

// 2. Senior Profile Card
export const SeniorProfileCard = ({ senior, onSelect, isSelected, isDisabled, disabledReason }) => {
  return (
    <div className={`p-4 rounded-xl border transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
      <div className="flex justify-between items-start">
        <div className="flex space-x-3">
          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg">
            {senior.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{senior.name}</h4>
            <p className="text-sm text-slate-500">{senior.practiceAreas.join(" • ")} | {senior.location}</p>
            <div className="mt-1 space-x-2">
              <RecognitionBadge tier={senior.tier} />
              <span className="text-xs text-slate-500 flex items-center inline-flex">
                <Star size={10} className="text-amber-400 mr-1" fill="currentColor" />
                {senior.stats.rating} ({senior.stats.responseCount})
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          {isDisabled ? (
            <Badge variant="amber">{disabledReason || "Unavailable"}</Badge>
          ) : (
            <Button 
              variant={isSelected ? "primary" : "outline"} 
              onClick={() => onSelect(senior)}
              className="px-3 py-1 text-xs h-8"
            >
              {isSelected ? "Selected" : "Select"}
            </Button>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-500 grid grid-cols-2 gap-2">
        <div>Response time: <span className="font-medium text-slate-700">~{senior.stats.responseTime}</span></div>
        <div>Availability: <span className={`font-medium ${senior.stats.answeredThisMonth >= senior.stats.monthlyLimit ? 'text-red-500' : 'text-emerald-600'}`}>
          {senior.stats.answeredThisMonth}/{senior.stats.monthlyLimit} slots used
        </span></div>
      </div>
    </div>
  );
};

// 3. Question Card
export const QuestionCard = ({ question, role, onAction }) => {
  const isPending = question.status === 'pending';
  
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
           <Badge variant={isPending ? "amber" : "green"}>
             {isPending ? "Pending Response" : "Answered"}
           </Badge>
           <span className="text-xs text-slate-400 ml-3">{new Date(question.createdAt).toLocaleDateString()}</span>
        </div>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{question.practiceArea}</span>
      </div>
      
      <h3 className="text-lg font-medium text-slate-900 mb-2">"{question.content}"</h3>
      
      {question.status === 'answered' && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex items-center space-x-2 mb-2">
            <Award size={16} className="text-amber-500" />
            <span className="text-sm font-bold text-slate-900">Answered by Mentor</span>
          </div>
          <p className="text-slate-700 whitespace-pre-wrap">{question.answer}</p>
        </div>
      )}

      {role === 'senior' && isPending && (
        <div className="mt-4 flex justify-end space-x-3">
          <Button variant="outline" className="text-sm" onClick={() => onAction('decline', question)}>Decline</Button>
          <Button variant="primary" className="text-sm" onClick={() => onAction('answer', question)}>Answer Question</Button>
        </div>
      )}
    </Card>
  );
};