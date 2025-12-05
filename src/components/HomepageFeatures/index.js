import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";
import Link from "@docusaurus/Link";

const MicroservicesList = [
  {
    title: "📦 Stock y Logística",
    emoji: "📦",
    description: "Gestión de inventario, almacenes y movimientos de robots",
    link: "/docs/category/stock",
  },
  {
    title: "🤖 Alquiler",
    emoji: "🤖",
    description: "Gestión de reservas, modificaciones y cancelaciones",
    link: "/docs/category/alquiler",
  },
  {
    title: "👤 Usuarios y Autenticación",
    emoji: "👤",
    description: "Gestión de usuarios, créditos y autenticación JWT",
    link: "/docs/category/usuarios",
  },
  {
    title: "📊 Estado de Robots",
    emoji: "📊",
    description: "Monitoreo en tiempo real del estado de los robots",
    link: "/docs/category/estado-de-robots",
  },
  {
    title: "🔔 Notificaciones",
    emoji: "🔔",
    description: "Sistema de notificaciones y alertas a usuarios",
    link: "/docs/category/notificaciones",
  },
];

function MicroserviceCard({ emoji, title, description, link }) {
  return (
    <div className={styles.microserviceCol}>
      <Link to={link} className={styles.microserviceCard}>
        <div className="text--center">
          <span className={styles.microserviceEmoji}>{emoji}</span>
        </div>
        <div className="text--center padding-horiz--md">
          <Heading as="h3">{title}</Heading>
          <p>{description}</p>
        </div>
      </Link>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="text--center margin-bottom--lg">
          <Heading as="h2">🏗️ Arquitectura de Microservicios</Heading>
          <p>Explora la documentación de cada componente del sistema RoboFIS</p>
        </div>
        <div className="row">
          {MicroservicesList.map((props, idx) => (
            <MicroserviceCard key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
