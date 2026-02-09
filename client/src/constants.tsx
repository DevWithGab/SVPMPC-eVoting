import React from 'react';
import { 
  Heart, 
  Utensils, 
  Activity, 
  GraduationCap, 
  Users, 
  Droplets, 
  Zap, 
  Briefcase, 
  Building2, 
  Scale, 
  Globe, 
  Leaf, 
  Fish, 
  Mountain, 
  Shield, 
  Handshake 
} from 'lucide-react';

export interface SDG {
  id: number;
  title: string;
  description: string;
  color: string;
  iconName: string;
}

export const SDGS: SDG[] = [
  {
    id: 4,
    title: 'Quality Education',
    description: 'Ensure inclusive and equitable quality education',
    color: 'bg-red-500',
    iconName: 'GraduationCap'
  },
  {
    id: 5,
    title: 'Gender Equality',
    description: 'Achieve gender equality and empower all women and girls',
    color: 'bg-orange-500',
    iconName: 'Users'
  },
  {
    id: 10,
    title: 'Reduced Inequalities',
    description: 'Reduce inequality within and among countries',
    color: 'bg-pink-600',
    iconName: 'Scale'
  },
  {
    id: 16,
    title: 'Peace & Justice',
    description: 'Promote peaceful and inclusive societies for sustainable development',
    color: 'bg-blue-700',
    iconName: 'Shield'
  },
  {
    id: 17,
    title: 'Partnerships',
    description: 'Strengthen the means of implementation and revitalize partnerships',
    color: 'bg-blue-800',
    iconName: 'Handshake'
  }
];

export const SdgIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    Heart,
    Utensils,
    Activity,
    GraduationCap,
    Users,
    Droplets,
    Zap,
    Briefcase,
    Building2,
    Scale,
    Globe,
    Leaf,
    Fish,
    Mountain,
    Shield,
    Handshake
  };

  const IconComponent = iconMap[name] || Activity;
  return React.createElement(IconComponent, { className, size: 20 });
};

export const TRANSLATIONS = {
  EN: {
    heroSubtitle: 'Secure, transparent, and built on the foundation of our community\'s collective vision.',
    voteButton: 'VOTE NOW',
    voteButtonLoggedIn: 'CAST VOTE',
    resultsButton: 'VIEW RESULTS'
  },
  PH: {
    heroSubtitle: 'Ligtas, transparente, at itinayo sa pundasyon ng sama-samang pananaw ng aming komunidad.',
    voteButton: 'BUMOTO NGAYON',
    voteButtonLoggedIn: 'MAGBOTO',
    resultsButton: 'TINGNAN ANG RESULTA'
  }
};
