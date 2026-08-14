export default function PhoneFrame({ imageUrl, title }) {
  return (
    <div className="flex flex-col items-center gap-4">
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      <div className="relative w-[393px] mx-auto">
        {/* Phone bezels/frame */}
        <div className="bg-black rounded-[40px] p-3 shadow-2xl">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-10" />
          
          {/* Screen */}
          <div className="relative bg-white rounded-[35px] overflow-hidden aspect-[9/16]">
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}