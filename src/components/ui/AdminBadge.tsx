import React from 'react';
import { UserRole } from '@prisma/client';

interface AdminBadgeProps {
  role: UserRole;
}

export default function AdminBadge({ role }: AdminBadgeProps) {
  if (role !== UserRole.ADMIN && role !== UserRole.OWNER) {
    return null;
  }

  return (
    <div
      className='flex items-center gap-0 px-1 rounded-lg border border-zinc-700 bg-cosmic-latte transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/50 hover:scale-105 hover:border-orange-500 cursor-pointer'
      style={{
        paddingTop: '0px',
        paddingBottom: '0px'
      }}
      title={role === UserRole.OWNER ? 'Owner' : 'Admin'}
    >
      <div
        className='flex items-center gap-0'
        style={{
          animation: 'floatBadge 3s ease-in-out infinite'
        }}
      >
        <div
          className='flex-shrink-0'
          style={{
            width: '50px',
            height: '50px',
            marginLeft: '-5px'
          }}
        >
          <svg viewBox="0 0 2000 2000" className='w-full h-full'>
          <style>{`
            @keyframes cls1 {
              0% { fill: #f15a24; }
              34% { fill: #ed1c24; }
              66% { fill: #f7931e; }
              100% { fill: #f15a24; }
            }
            @keyframes cls2 {
              0% { fill: #f7931e; }
              34% { fill: #f15a24; }
              66% { fill: #ed1c24; }
              100% { fill: #f7931e; }
            }
            @keyframes cls3 {
              0% { fill: #ed1c24; }
              34% { fill: #f7931e; }
              66% { fill: #f15a24; }
              100% { fill: #ed1c24; }
            }
            @keyframes floatBadge {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-3px); }
            }
            .tri-1 { animation: cls1 4s ease infinite both; }
            .tri-2 { animation: cls2 4s ease infinite both; }
            .tri-3 { animation: cls3 4s ease infinite both; }
          `}</style>
          <polygon
            className="tri-1"
            points="928 781 1021 951 784.5 1371.97 1618 1371.97 1530.32 1544 509 1539 928 781"
          />
          <polygon
            className="tri-3"
            points="1618 1371.97 784.5 1371.97 874.93 1211 1346 1211 923.1 456 1110.06 456 1618 1371.97"
          />
          <polygon
            className="tri-2"
            points="418 1372.74 509 1539 928 781 1162.32 1211 1346 1211 923.1 456 418 1372.74"
          />
        </svg>
      </div>
      <span
        className='text-lg font-bold uppercase tracking-widest'
        style={{
          color: '#f15a24',
          fontFamily: 'Impact, "Arial Black", sans-serif',
          letterSpacing: '0.15em'
        }}
      >
        {role === UserRole.OWNER ? 'Owner' : 'Admin'}
      </span>
      </div>
    </div>
  );
}
