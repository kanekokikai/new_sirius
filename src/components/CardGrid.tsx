import { FeatureCard as FeatureCardType } from "../types";
import FeatureCard from "./FeatureCard";

interface Props {
  features: FeatureCardType[];
  getLink: (feature: FeatureCardType) => string;
}

const CardGrid = ({ features, getLink }: Props) => (
  <div className="card-grid">
    {features.map((feature) => (
      <FeatureCard key={feature.key} feature={feature} to={getLink(feature)} />
    ))}
  </div>
);

export default CardGrid;

