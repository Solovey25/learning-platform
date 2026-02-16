import React from "react";
import { Card, CardBody, CardHeader, CardFooter, Button, Input, Textarea, Divider, Accordion, AccordionItem } from "@heroui/react";
import { Icon } from "@iconify/react";

interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctOption: number;
  type?: "choice" | "text";
}

interface ChapterData {
  id?: string;
  title: string;
  content: string;
  quiz: QuizQuestion[];
}

interface ChapterFormProps {
  chapter: ChapterData;
  index: number;
  onChange: (index: number, chapter: ChapterData) => void;
  onRemove: (index: number) => void;
  showRemoveButton: boolean;
}

export const ChapterForm: React.FC<ChapterFormProps> = ({
  chapter,
  index,
  onChange,
  onRemove,
  showRemoveButton
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange(index, {
      ...chapter,
      [name]: value
    });
  };

  const handleQuizQuestionChange = (qIndex: number, field: string, value: string) => {
    const updatedQuiz = [...chapter.quiz];
    updatedQuiz[qIndex] = {
      ...updatedQuiz[qIndex],
      [field]: value
    };
    onChange(index, {
      ...chapter,
      quiz: updatedQuiz
    });
  };

  const handleQuizOptionChange = (qIndex: number, optionIndex: number, value: string) => {
    const updatedQuiz = [...chapter.quiz];
    const updatedOptions = [...updatedQuiz[qIndex].options];
    updatedOptions[optionIndex] = value;
    updatedQuiz[qIndex] = {
      ...updatedQuiz[qIndex],
      options: updatedOptions
    };
    onChange(index, {
      ...chapter,
      quiz: updatedQuiz
    });
  };

  const handleCorrectOptionChange = (qIndex: number, value: number) => {
    const updatedQuiz = [...chapter.quiz];
    updatedQuiz[qIndex] = {
      ...updatedQuiz[qIndex],
      correctOption: value
    };
    onChange(index, {
      ...chapter,
      quiz: updatedQuiz
    });
  };

  const addQuizQuestion = () => {
    onChange(index, {
      ...chapter,
      quiz: [
        ...chapter.quiz,
        {
          id: undefined,
          question: "",
          options: ["", "", "", ""],
          correctOption: 0,
          type: "choice",
        }
      ]
    });
  };

  const removeQuizQuestion = (qIndex: number) => {
    if (chapter.quiz.length > 1) {
      const updatedQuiz = [...chapter.quiz];
      updatedQuiz.splice(qIndex, 1);
      onChange(index, {
        ...chapter,
        quiz: updatedQuiz
      });
    }
  };

  return (
    <Card className="mb-6" disableRipple>
      <CardHeader className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Глава {index + 1}</h3>
        {showRemoveButton && (
          <Button
            size="sm"
            color="danger"
            variant="light"
            isIconOnly
            onPress={() => onRemove(index)}
          >
            <Icon icon="lucide:trash" />
          </Button>
        )}
      </CardHeader>
      <Divider />
      <CardBody className="space-y-6">
        <Input
          label="Название главы"
          name="title"
          value={chapter.title}
          onChange={handleInputChange}
          placeholder="Введите название главы"
          isRequired
        />
        <Textarea
          label="Содержимое главы (HTML)"
          name="content"
          value={chapter.content}
          onChange={handleInputChange}
          placeholder="Введите содержимое главы (поддерживается HTML)"
          minRows={5}
          isRequired
        />

        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold">Вопросы квиза</h4>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              startContent={<Icon icon="lucide:plus" />}
              onPress={addQuizQuestion}
            >
              Добавить вопрос
            </Button>
          </div>

          <Accordion className="px-0" selectionMode="multiple" defaultSelectedKeys={["0"]}>
            {chapter.quiz.map((question, qIndex) => (
              <AccordionItem
                key={qIndex}
                textValue={`Вопрос ${qIndex + 1}`}
                title={
                  <div className="flex justify-between items-center w-full">
                    <span>Вопрос {qIndex + 1}</span>
                    {chapter.quiz.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQuizQuestion(qIndex);
                        }}
                        className="text-danger cursor-pointer p-1 rounded-full hover:bg-danger-50"
                      >
                        <Icon icon="lucide:trash" size={16} />
                      </span>
                    )}
                  </div>
                }
              >
                <div className="space-y-4 py-2">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Вопрос"
                      value={question.question}
                      onChange={(e) => handleQuizQuestionChange(qIndex, "question", e.target.value)}
                      placeholder="Введите текст вопроса"
                      isRequired
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-small font-medium">Тип вопроса</span>
                      <select
                        className="w-full rounded-large border border-default-200 bg-default-100 px-3 py-2 text-small outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        value={question.type || "choice"}
                        onChange={(e) => handleQuizQuestionChange(qIndex, "type", e.target.value)}
                      >
                        <option value="choice">С одним правильным ответом</option>
                        <option value="text">Свободный ответ (без проверки)</option>
                      </select>
                    </div>
                  </div>
                  
                  {question.type === "text" ? (
                    <div className="space-y-3">
                      <p className="text-small font-medium">Правильный ответ</p>
                      <Input
                        value={question.options?.[0] || ""}
                        onChange={(e) => handleQuizOptionChange(qIndex, 0, e.target.value)}
                        placeholder="Введите правильный ответ"
                        className="flex-1"
                        isRequired
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-small font-medium">Варианты ответов (выбери один правильный)</p>
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-option-${index}-${qIndex}`}
                            checked={question.correctOption === optIndex}
                            onChange={() => handleCorrectOptionChange(qIndex, optIndex)}
                            className="w-4 h-4 text-primary"
                          />
                          <Input
                            value={option}
                            onChange={(e) => handleQuizOptionChange(qIndex, optIndex, e.target.value)}
                            placeholder={`Вариант ${optIndex + 1}`}
                            className="flex-1"
                            isRequired
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </CardBody>
    </Card>
  );
};
