import { Link } from "react-router-dom";
import { FeatureCard as FeatureCardType } from "../types";

interface Props {
  feature: FeatureCardType;
  to: string;
}

const FeatureCard = ({ feature, to }: Props) => (
  <Link className="feature-card" to={to}>
    <h3>{feature.name}</h3>
    <p>{feature.description}</p>
  </Link>
);

export default FeatureCard;

