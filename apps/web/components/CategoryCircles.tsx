import Link from 'next/link';

const CATEGORIES = [
  { name: 'Men', slug: 'men', image: '/categories/men.jpg' },
  { name: 'Women', slug: 'women', image: '/categories/women.jpg' },
  { name: 'Kids', slug: 'kids', image: '/categories/kids.jpg' },
  { name: 'Shoes', slug: 'shoes', image: '/categories/shoes.jpg' },
  { name: 'Bags', slug: 'bags', image: '/categories/bags.jpg' },
  { name: 'Accessories', slug: 'accessories', image: '/categories/accessories.jpg' },
];

export function CategoryCircles() {
  return (
    <section className="bg-white">
      {/* Maroon border — right at the top, attaches to bottom of banner above */}
      <div className="border-t-2 border-wine" />

      {/* Big gap below the border */}
      <div className="h-8 sm:h-12 lg:h-14" aria-hidden="true" />

      {/* Circles content */}
      <div className="container-wrap px-4 sm:px-6 pb-8 sm:pb-12 lg:pb-14">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-5 sm:gap-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="group flex flex-col items-center"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-line bg-sand flex items-center justify-center group-hover:border-wine transition duration-300 group-hover:scale-105 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <span className="text-xs sm:text-sm font-medium text-ink mt-3 group-hover:text-wine transition text-center">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}