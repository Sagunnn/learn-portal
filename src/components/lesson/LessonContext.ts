import { createContext, useContext } from "react";

/** The open lesson's id, for components deep in a chunk that save progress (e.g. challenges). */
export const LessonIdContext = createContext<string>("");
export const useLessonId = () => useContext(LessonIdContext);
