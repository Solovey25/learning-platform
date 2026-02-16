import React from "react";
import { Link } from "react-router-dom";
import { Card, CardBody, CardFooter, Image, Button, Progress } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Course } from "../data/courses";

interface CourseCardProps {
  course: Course;
}

const FALLBACK_IMAGE = "https://www.svgrepo.com/show/303548/git-icon-logo.svg";

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const { id, title, description, imageUrl, progress, enrolled } = course;
  const [imageSrc, setImageSrc] = React.useState(imageUrl || FALLBACK_IMAGE);
  
  return (
    <Card className="w-full bg-slate-900/70 border border-slate-800 shadow-lg shadow-slate-950/40 hover:shadow-xl hover:-translate-y-1 transition-transform duration-200" disableRipple>
      <CardBody className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-950/70 ring-1 ring-slate-800">
            <Image
              removeWrapper
              alt={title}
              className="h-8 w-8 object-contain"
              src={imageSrc}
              onError={() => {
                if (imageSrc !== FALLBACK_IMAGE) {
                  setImageSrc(FALLBACK_IMAGE);
                }
              }}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold mb-0.5 line-clamp-1">{title}</h3>
            <p className="text-xs text-slate-300 line-clamp-2">{description}</p>
          </div>
        </div>
      </CardBody>
      <CardFooter className="flex flex-col items-stretch gap-3 border-t border-slate-800 bg-slate-950/60">
        {enrolled && typeof progress === 'number' && (
          <div className="w-full">
            <div className="flex justify-between text-[11px] mb-1 text-slate-300">
              <p className="uppercase tracking-wide">Прогресс</p>
              <p>{progress}%</p>
            </div>
            <Progress
              aria-label="Course progress"
              value={progress}
              color="primary"
              className="h-1.5"
            />
          </div>
        )}
        <Button
          as={Link}
          to={`/courses/${id}`}
          color="primary"
          variant={enrolled ? "flat" : "solid"}
          fullWidth
          endContent={<Icon icon="lucide:arrow-right" />}
        >
          {enrolled ? "Продолжить" : "Начать курс"}
        </Button>
      </CardFooter>
    </Card>
  );
};
