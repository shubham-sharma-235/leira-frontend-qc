const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');

dotenv.config();

const products = [
  {
    id: "jasmine",
    name: "Jasmine",
    subName: "Calming floral scent.",
    price: "₹2999",
    description: "Pure Jasmine Extract - Soothing Aroma",
    folderPath: "/images/Jasmine",
    themeColor: "#FFB300",
    animationCutoff: 0.8,
    backgroundColor: "#ffffff",
    bgFit: "cover",
    gradient: "radial-gradient(circle at center, #2a1c0a 0%, #000000 70%)",
    features: ["Calming", "Floral", "Pure Extract"],
    stats: [
      { label: "Purity", val: "100%" },
      { label: "Origin", val: "India" },
      { label: "Type", val: "Oil" },
    ],
    section1: { title: "Jasmine.", subtitle: "Nature's calm, captured in a bottle." },
    section2: {
      title: "Pure Floral Essence.",
      subtitle: "Delicately crafted from the soul of jasmine blossoms.",
    },
    section3: {
      title: "Inner Beauty, Awakened.",
      subtitle: "A soothing aroma that balances the mind and senses.",
    },
    section4: { title: "Timeless. Elegant. Sensual.", subtitle: "Designed to be felt, not just worn." },
    section5: { title: "LEIRA", subtitle: "Eau de Bijou · Inner Beauty Perfume" },
    introducingSection: {
      subtitle: "INTRODUCING",
      title: "THE ESSENCE OF YOU",
      paragraph1: "It is an intimate perfume crafted exclusively for women. Formulated with a luxurious fusion of Roses, Jasmine, and Cananga odorata (ylang-ylang), Leira eliminates unwanted odors and nourishes and soothes delicate skin, leaving a long-lasting, sensual aroma.",
      paragraph2: "Designed for the modern woman who values elegance, self-care, and all-day freshness, Leira is a must-have in every feminine care routine. Blending the purest natural essential oils to create an exquisite fragrance that enhances confidence and freshness.",
      bottleImage: "/images/Jasmine/1.jpg",
    },
    detailsSection: {
      title: "The King of Fruits",
      description: "Our Cream Mango juice uses only the finest Ratnagiri Alphonso mangoes. Known for their rich sweetness and vibrant color, these mangoes are cold-pressed within hours of harvest to preserve every drop of nutrient-rich goodness. It's not just juice; it's a liquid gold experience.",
      imageAlt: "Mango Details",
    },
    freshnessSection: {
      title: "Farm to Bottle",
      description: "We believe in absolute transparency. From the orchard to the bottle, our process is designed to minimize oxidation and maximize flavor. HPP (High Pressure Processing) ensures that our juice stays safe and fresh without any heat treatment, keeping the vital enzymes and vitamins intact.",
    },
    buyNowSection: {
      price: "₹2999",
      unit: "per 15ml bottle",
      processingParams: ["Cold Pressed", "Never Heated", "HPP Treated"],
      deliveryPromise: "Next-day delivery available in metro cities. Chilled packaging ensures peak freshness.",
      returnPolicy: "100% Satisfaction Guarantee. Not happy? We'll replace it, no questions asked.",
    },
    images: ["/images/jasmine.png", "/images/Jasmine1.png"],
    stock: 100,
    status: "active"
  },
  {
    id: "ylang-ylang",
    name: "Ylang Ylang",
    subName: "Exotic floral essence.",
    price: "₹2999",
    description: "Pure Ylang Ylang Extract - Exotic Aroma",
    folderPath: "/images/Yang",
    themeColor: "#FFB300",
    animationCutoff: 0.8,
    backgroundColor: "#ffffff",
    bgFit: "cover",
    gradient: "radial-gradient(circle at center, #2a1c0a 0%, #000000 70%)",
    features: ["Exotic", "Floral", "Pure Extract"],
    stats: [
      { label: "Purity", val: "100%" },
      { label: "Origin", val: "India" },
      { label: "Type", val: "Oil" },
    ],
    section1: { title: "Ylang Ylang.", subtitle: "Exotic essence, captured in a bottle." },
    section2: {
      title: "Pure Floral Essence.",
      subtitle: "Delicately crafted from exotic ylang-ylang blossoms.",
    },
    section3: {
      title: "Inner Beauty, Awakened.",
      subtitle: "An exotic aroma that balances the mind and senses.",
    },
    section4: { title: "Timeless. Elegant. Sensual.", subtitle: "Designed to be felt, not just worn." },
    section5: { title: "LEIRA", subtitle: "Eau de Bijou · Inner Beauty Perfume" },
    introducingSection: {
      subtitle: "INTRODUCING",
      title: "THE ESSENCE OF YOU",
      paragraph1: "It is an intimate perfume crafted exclusively for women. Formulated with a luxurious fusion of Roses, Jasmine, and Cananga odorata (ylang-ylang), Leira eliminates unwanted odors and nourishes and soothes delicate skin, leaving a long-lasting, sensual aroma.",
      paragraph2: "Designed for the modern woman who values elegance, self-care, and all-day freshness, Leira is a must-have in every feminine care routine. Blending the purest natural essential oils to create an exquisite fragrance that enhances confidence and freshness.",
      bottleImage: "/images/Yang/1.jpg",
    },
    detailsSection: {
      title: "The Exotic Elixir",
      description: "Our Ylang Ylang extract uses only the finest flowers. Known for their rich, exotic fragrance, these flowers are carefully processed to preserve every drop of aromatic goodness.",
      imageAlt: "Ylang Ylang Details",
    },
    freshnessSection: {
      title: "Farm to Bottle",
      description: "We believe in absolute transparency. From the garden to the bottle, our process is designed to preserve the natural essence and maximize the aromatic experience.",
    },
    buyNowSection: {
      price: "₹2999",
      unit: "per 15ml bottle",
      processingParams: ["Cold Pressed", "Never Heated", "HPP Treated"],
      deliveryPromise: "Next-day delivery available in metro cities. Chilled packaging ensures peak freshness.",
      returnPolicy: "100% Satisfaction Guarantee. Not happy? We'll replace it, no questions asked.",
    },
    images: ["/images/yalng.png", "/images/y1.png"],
    stock: 100,
    status: "active"
  },
  {
    id: "damask-rose",
    name: "Damask Rose",
    subName: "Romantic floral essence.",
    price: "₹2999",
    description: "Pure Damask Rose Extract - Romantic Aroma",
    folderPath: "/images/Damask",
    themeColor: "#FFB300",
    animationCutoff: 0.8,
    backgroundColor: "#ffffff",
    bgFit: "cover",
    gradient: "radial-gradient(circle at center, #2a1c0a 0%, #000000 70%)",
    features: ["Romantic", "Floral", "Pure Extract"],
    stats: [
      { label: "Purity", val: "100%" },
      { label: "Origin", val: "India" },
      { label: "Type", val: "Oil" },
    ],
    section1: { title: "Damask Rose.", subtitle: "Romantic essence, captured in a bottle." },
    section2: {
      title: "Pure Floral Essence.",
      subtitle: "Delicately crafted from romantic damask rose blossoms.",
    },
    section3: {
      title: "Inner Beauty, Awakened.",
      subtitle: "A romantic aroma that balances the mind and senses.",
    },
    section4: { title: "Timeless. Elegant. Sensual.", subtitle: "Designed to be felt, not just worn." },
    section5: { title: "LEIRA", subtitle: "Eau de Bijou · Inner Beauty Perfume" },
    introducingSection: {
      subtitle: "INTRODUCING",
      title: "THE ESSENCE OF YOU",
      paragraph1: "It is an intimate perfume crafted exclusively for women. Formulated with a luxurious fusion of Roses, Jasmine, and Cananga odorata (ylang-ylang), Leira eliminates unwanted odors and nourishes and soothes delicate skin, leaving a long-lasting, sensual aroma.",
      paragraph2: "Designed for the modern woman who values elegance, self-care, and all-day freshness, Leira is a must-have in every feminine care routine. Blending the purest natural essential oils to create an exquisite fragrance that enhances confidence and freshness.",
      bottleImage: "/images/Damask/1.jpg",
    },
    detailsSection: {
      title: "The Ruby Elixir",
      description: "Each bottle contains the essence of premium damask roses. We use a gentle extraction method to preserve the natural fragrance and therapeutic properties.",
      imageAlt: "Damask Rose Details",
    },
    freshnessSection: {
      title: "Farm to Bottle",
      description: "We believe in absolute transparency. From the garden to the bottle, our process is designed to preserve the natural essence and maximize the aromatic experience.",
    },
    buyNowSection: {
      price: "₹2999",
      unit: "per 15ml bottle",
      processingParams: ["Cold Pressed", "Never Heated", "HPP Treated"],
      deliveryPromise: "Next-day delivery available in metro cities. Chilled packaging ensures peak freshness.",
      returnPolicy: "100% Satisfaction Guarantee. Not happy? We'll replace it, no questions asked.",
    },
    images: ["/images/Damk.png", "/images/d1.jpg"],
    stock: 100,
    status: "active"
  }
];

const seedProducts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leira');
    console.log('✅ MongoDB Connected');

    // Clear existing products
    await Product.deleteMany();
    console.log('🗑️  Existing products deleted');

    // Insert products
    await Product.insertMany(products);
    console.log(`✅ ${products.length} products seeded successfully`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    process.exit(1);
  }
};

seedProducts();

