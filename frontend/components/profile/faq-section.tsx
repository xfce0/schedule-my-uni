"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpCircle } from "lucide-react"

export function FAQSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Частые вопросы
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Безопасно ли вводить свой логин и пароль?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Да, абсолютно безопасно. Ваши данные хранятся в зашифрованном виде (AES-256) и используются только для получения расписания из linguanet. Мы не передаем их третьим лицам и вы можете удалить их в любой момент.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>Это платное приложение?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Нет, это полностью бесплатное приложение с открытым исходным кодом (Open Source). Мы создали его для студентов МГЛУ, чтобы упростить работу с расписанием.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger>Как добавить или удалить домашнее задание?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Перейдите на вкладку "Задания" и нажмите кнопку "Добавить задание". Чтобы удалить задание, свайпните влево или используйте кнопку удаления в карточке задания.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6">
            <AccordionTrigger>Где исходный код приложения?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Проект опубликован на GitHub:{" "}
              <a
                href="https://github.com/xfce0/schedule-my-uni"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                github.com/xfce0/schedule-my-uni
              </a>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
