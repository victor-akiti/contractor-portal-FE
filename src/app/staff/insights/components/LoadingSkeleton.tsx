'use client';

interface SkeletonProps {
  rows?: number;
  height?: number;
}

function Bone({ h = 20, w = '100%', mb = 8 }: { h?: number; w?: string | number; mb?: number }) {
  return (
    <div style={{
      height: h,
      width: w,
      borderRadius: 6,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      marginBottom: mb,
    }} />
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: '#f8f9fa', borderRadius: '0.5rem', padding: '1rem' }}>
          <Bone h={12} w="60%" mb={12} />
          <Bone h={32} w="70%" mb={6} />
          <Bone h={10} w="50%" mb={0} />
        </div>
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: SkeletonProps) {
  return (
    <div>
      <Bone h={36} mb={8} />
      {Array.from({ length: rows }).map((_, i) => (
        <Bone key={i} h={44} mb={4} />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div style={{ background: '#f8f9fa', borderRadius: '0.5rem', height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '80%' }}>
        <Bone h={height * 0.6} mb={0} />
      </div>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

export default function LoadingSkeleton({ rows = 5, height = 20 }: SkeletonProps) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <Bone key={i} h={height} mb={8} />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}
