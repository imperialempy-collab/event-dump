import { useRouter } from 'next/router';

export default function Info() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center p-6 font-sans text-gray-800">
      <div className="w-full max-w-md mt-6 flex flex-col items-center">
        
        <button 
          onClick={() => router.push('/')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50 transition mb-12 self-start"
        >
          ←
        </button>
        
        <div className="mt-20">
          <span className="text-9xl font-serif text-blue-600">¿?</span>
        </div>

      </div>
    </div>
  );
}