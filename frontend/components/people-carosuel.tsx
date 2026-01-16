"use client"

import { useEffect, useState } from "react"

export function PeopleCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  const people = [
    {
      id: 1,
      image: "/images/anish.png",
      alt: "Anish",
    },
    {
      id: 2,
      image: "/images/sachi.png",
      alt: "Sachi",
    },
    {
      id: 3,
      image: "/images/durva.png",
      alt: "Durva",
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % people.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [people.length])

  return (
    <div className="relative z-10 w-80 md:w-96 lg:w-[1000px] h-[800px] md:h-[1000px] lg:h-[800px] mx-auto">
      {/* Carousel container */}
      <div className="relative w-full h-full overflow-hidden">
        {people.map((person, index) => (
          <div
            key={person.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={person.image}
              alt={person.alt}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Indicator dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-30">
        {people.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === activeIndex ? "bg-white w-8" : "bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Show person ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}