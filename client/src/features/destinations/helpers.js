import { PROVINCE_GRADIENTS } from "./constants";

export function chooseDestinationImage(destination) {
  return destination.image_url || "/images/hero-nepal-premium.png";
}

export function getProvinceGradient(destination) {
  return PROVINCE_GRADIENTS[destination.region] || "linear-gradient(135deg, rgba(10,37,64,0.92), rgba(0,180,216,0.68))";
}

export function formatDestinationMeta(destination) {
  return [destination.district, destination.region].filter(Boolean).join(", ");
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
